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
    # Mocking deep checks for scaffold. In a real app we'd ping db, agent, and ollama here.
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
    return {"provider": settings.llm_provider, "fallback": settings.llm_fallback, "phase": "6"}

async def _proxy_agent_sse(client: httpx.AsyncClient, request_id: str):
    try:
        async with client.stream("POST", f"{settings.agent_url}/agent/run", json={}, headers={"x-request-id": request_id}) as response:
            if response.status_code != 200:
                yield f"data: {json.dumps({'error': f'Agent error {response.status_code}'})}\n\n"
                return
            async for chunk in response.aiter_text():
                yield chunk
    except httpx.ConnectError:
        # Agent down
        yield f"data: {json.dumps({'error': 'Agent down', 'retry': True})}\n\n"
    except Exception as e:
        log.error("agent_proxy_error", exc=str(e))
        yield f"data: {json.dumps({'error': 'Failed to connect to agent'})}\n\n"

@app.post("/sessions/{session_id}/messages")
async def post_message(session_id: str, request: Request) -> StreamingResponse:
    request_id = request.headers.get("x-request-id", "unknown")
    client = httpx.AsyncClient()
    return StreamingResponse(_proxy_agent_sse(client, request_id), media_type="text/event-stream")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request.headers.get("x-request-id", "unknown")
    log.error("unhandled_exception", exc=str(exc), request_id=request_id)
    return JSONResponse(status_code=500, content={"code": "internal_error", "message": "An internal error occurred", "request_id": request_id})
