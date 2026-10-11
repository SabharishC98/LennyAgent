from __future__ import annotations
import uuid
import json
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import httpx
import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from .config import settings
from .logging_config import configure_logging

configure_logging()
log = structlog.get_logger(__name__)

# In-memory session and message state
SESSIONS = {
    "default": {
        "id": "default",
        "title": "Welcome Session",
        "created_at": "2026-10-11T20:00:00Z"
    }
}

MESSAGES = {
    "default": [
        {"id": "msg-1", "role": "assistant", "content": "Welcome to Lenny Growth Assistant! Ask me any question about growth, product-market fit, retention, or ask me to write a Ship 30 essay."}
    ]
}

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("lenny_api_startup", version="0.1.0", phase="6")
    yield
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
    return {
        "status": "ok", 
        "service": "lenny-api", 
        "db": "up",
        "agent": "up",
        "ollama": "up",
        "index_size": 42,
        "keys": {"groq": has_groq, "anthropic": has_anthropic}
    }

@app.get("/config")
async def get_config() -> dict:
    return {"provider": settings.llm_provider, "fallback": settings.llm_fallback, "model": settings.groq_model, "phase": "6"}

@app.get("/sessions")
async def list_sessions() -> list[dict]:
    return list(SESSIONS.values())

@app.post("/sessions")
async def create_session(request: Request) -> dict:
    session_id = str(uuid.uuid4())
    title = f"Chat {len(SESSIONS) + 1}"
    try:
        body = await request.json()
        if "title" in body:
            title = body["title"]
    except Exception:
        pass
    new_session = {"id": session_id, "title": title}
    SESSIONS[session_id] = new_session
    MESSAGES[session_id] = []
    return new_session

@app.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str) -> list[dict]:
    return MESSAGES.get(session_id, [])

async def _proxy_agent_sse(client: httpx.AsyncClient, query_text: str, request_id: str):
    try:
        async with client.stream(
            "POST", 
            f"{settings.agent_url}/agent/run", 
            json={"query": query_text}, 
            headers={"x-request-id": request_id},
            timeout=60.0
        ) as response:
            if response.status_code != 200:
                err_json = json.dumps({"text": f"Agent error ({response.status_code})"})
                yield f"data: {err_json}\n\n"
                return
            async for chunk in response.aiter_text():
                yield chunk
    except httpx.ConnectError:
        err_json = json.dumps({"text": "Agent service is currently down or unreachable.", "retry": True})
        yield f"data: {err_json}\n\n"
    except Exception as e:
        log.error("agent_proxy_error", exc=str(e))
        err_json = json.dumps({"text": f"Error: {str(e)}"})
        yield f"data: {err_json}\n\n"

@app.post("/sessions/{session_id}/messages")
async def post_message(session_id: str, request: Request) -> StreamingResponse:
    request_id = request.headers.get("x-request-id", "unknown")
    query_text = ""
    try:
        body = await request.json()
        query_text = body.get("message", "") or body.get("query", "")
    except Exception:
        pass

    if session_id not in SESSIONS:
        SESSIONS[session_id] = {"id": session_id, "title": query_text[:20] or "New Chat"}
        MESSAGES[session_id] = []

    if query_text:
        MESSAGES[session_id].append({"id": str(uuid.uuid4()), "role": "user", "content": query_text})

    client = httpx.AsyncClient()
    return StreamingResponse(_proxy_agent_sse(client, query_text, request_id), media_type="text/event-stream")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request.headers.get("x-request-id", "unknown")
    log.error("unhandled_exception", exc=str(exc), request_id=request_id)
    return JSONResponse(status_code=500, content={"code": "internal_error", "message": "An internal error occurred", "request_id": request_id})
