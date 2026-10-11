from __future__ import annotations
import uuid
import json
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import httpx
import structlog
import asyncpg
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from .config import settings
from .logging_config import configure_logging

configure_logging()
log = structlog.get_logger(__name__)

db_pool: asyncpg.Pool | None = None

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global db_pool
    log.info("lenny_api_startup", version="0.1.0", phase="6")
    try:
        db_pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=1,
            max_size=10,
            command_timeout=15.0
        )
        log.info("database_pool_initialized")
    except Exception as e:
        log.error("database_pool_init_failed", error=str(e))
        db_pool = None
    yield
    if db_pool:
        await db_pool.close()
    log.info("lenny_api_shutdown")

app = FastAPI(title="Lenny Growth Assistant API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def request_id_middleware(request: Request, call_next) -> Response:
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    with structlog.contextvars.bound_contextvars(request_id=request_id):
        try:
            response = await call_next(request)
        except httpx.ConnectError:
            return JSONResponse(status_code=502, content={"code": "bad_gateway", "message": "Agent service is down. Please retry later.", "request_id": request_id})
    response.headers["x-request-id"] = request_id
    return response

@app.get("/health")
async def health_check() -> dict:
    has_groq = bool(settings.groq_api_key)
    has_anthropic = bool(settings.anthropic_api_key)
    db_status = "down"
    index_size = 0
    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                count = await conn.fetchval("SELECT COUNT(*) FROM chunks;")
                index_size = count or 0
                db_status = "up"
        except Exception:
            db_status = "degraded"

    return {
        "status": "ok", 
        "service": "lenny-api", 
        "db": db_status,
        "agent": "up",
        "ollama": "up",
        "index_size": index_size,
        "keys": {"groq": has_groq, "anthropic": has_anthropic}
    }

@app.get("/config")
async def get_config() -> dict:
    return {"provider": settings.llm_provider, "fallback": settings.llm_fallback, "model": settings.groq_model, "phase": "6"}

@app.get("/sessions")
async def list_sessions() -> list[dict]:
    if not db_pool:
        return []
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("SELECT id::text, title, created_at FROM sessions ORDER BY created_at DESC;")
            return [{"id": str(r["id"]), "title": r["title"] or "New Chat", "created_at": r["created_at"].isoformat() if r["created_at"] else ""} for r in rows]
    except Exception as e:
        log.error("list_sessions_failed", error=str(e))
        return []

@app.post("/sessions")
async def create_session(request: Request) -> dict:
    title = "New Chat"
    try:
        body = await request.json()
        if "title" in body:
            title = body["title"]
    except Exception:
        pass

    session_id = str(uuid.uuid4())
    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                await conn.execute("INSERT INTO sessions (id, title, user_id) VALUES ($1::uuid, $2, 'default_user');", session_id, title)
        except Exception as e:
            log.error("create_session_db_failed", error=str(e))

    return {"id": session_id, "title": title}

@app.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str) -> list[dict]:
    if not db_pool:
        return []
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id::text, role, content, created_at FROM messages WHERE session_id = $1::uuid ORDER BY created_at ASC;",
                session_id
            )
            return [{"id": str(r["id"]), "role": r["role"], "content": r["content"]} for r in rows]
    except Exception as e:
        log.error("get_messages_db_failed", error=str(e))
        return []

async def _proxy_agent_sse(client: httpx.AsyncClient, session_id: str, query_text: str, request_id: str, history: list[dict]):
    assistant_full_text = ""
    try:
        async with client.stream(
            "POST", 
            f"{settings.agent_url}/agent/run", 
            json={"query": query_text, "history": history}, 
            headers={"x-request-id": request_id},
            timeout=60.0
        ) as response:
            if response.status_code != 200:
                err_json = json.dumps({"text": f"Agent error ({response.status_code})"})
                yield f"data: {err_json}\n\n"
                return
            async for chunk in response.aiter_text():
                yield chunk
                # Extract text for DB persistence
                for line in chunk.split("\n"):
                    if line.startswith("data: "):
                        data_part = line[6:].strip()
                        if data_part != "[DONE]":
                            try:
                                payload = json.loads(data_part)
                                if "text" in payload:
                                    assistant_full_text += payload["text"]
                            except Exception:
                                pass
    except httpx.ConnectError:
        err_json = json.dumps({"text": "Agent service is currently down or unreachable.", "retry": True})
        yield f"data: {err_json}\n\n"
    except Exception as e:
        log.error("agent_proxy_error", exc=str(e))
        err_json = json.dumps({"text": f"Error: {str(e)}"})
        yield f"data: {err_json}\n\n"

    # Persist the assistant turn to PostgreSQL
    if assistant_full_text and db_pool:
        try:
            async with db_pool.acquire() as conn:
                await conn.execute(
                    "INSERT INTO messages (id, session_id, role, content) VALUES ($1::uuid, $2::uuid, 'assistant', $3);",
                    str(uuid.uuid4()), session_id, assistant_full_text
                )
        except Exception as e:
            log.error("persist_assistant_message_failed", error=str(e))

@app.post("/sessions/{session_id}/messages")
async def post_message(session_id: str, request: Request) -> StreamingResponse:
    request_id = request.headers.get("x-request-id", "unknown")
    query_text = ""
    try:
        body = await request.json()
        query_text = body.get("message", "") or body.get("query", "")
    except Exception:
        pass

    # Ensure session exists in DB
    history: list[dict] = []
    if db_pool:
        try:
            async with db_pool.acquire() as conn:
                sess = await conn.fetchrow("SELECT id FROM sessions WHERE id = $1::uuid;", session_id)
                if not sess:
                    await conn.execute("INSERT INTO sessions (id, title, user_id) VALUES ($1::uuid, $2, 'default_user');", session_id, query_text[:24] or "New Chat")
                else:
                    # Update title if it's default
                    await conn.execute("UPDATE sessions SET title = $2 WHERE id = $1::uuid AND (title = 'New Chat' OR title = 'Welcome Session');", session_id, query_text[:24])

                # Persist user message
                if query_text:
                    await conn.execute(
                        "INSERT INTO messages (id, session_id, role, content) VALUES ($1::uuid, $2::uuid, 'user', $3);",
                        str(uuid.uuid4()), session_id, query_text
                    )

                # Fetch bounded rolling history (last 6 messages)
                hist_rows = await conn.fetch(
                    "SELECT role, content FROM messages WHERE session_id = $1::uuid ORDER BY created_at DESC LIMIT 6;",
                    session_id
                )
                history = [{"role": r["role"], "content": r["content"]} for r in reversed(hist_rows)]
        except Exception as e:
            log.error("db_session_message_save_failed", error=str(e))

    client = httpx.AsyncClient()
    return StreamingResponse(_proxy_agent_sse(client, session_id, query_text, request_id, history), media_type="text/event-stream")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request.headers.get("x-request-id", "unknown")
    log.error("unhandled_exception", exc=str(exc), request_id=request_id)
    return JSONResponse(status_code=500, content={"code": "internal_error", "message": "An internal error occurred", "request_id": request_id})
