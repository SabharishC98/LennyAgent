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
    log.info("lenny_api_startup", version="0.1.0", phase="3")
    yield
    log.info("lenny_api_shutdown")

app = FastAPI(title="Lenny Growth Assistant API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def request_id_middleware(request: Request, call_next) -> Response:
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    with structlog.contextvars.bound_contextvars(request_id=request_id):
        response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response

@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok", "service": "lenny-api", "phase": "3"}

@app.get("/config")
async def get_config() -> dict:
    return {"provider": settings.llm_provider, "fallback": settings.llm_fallback, "phase": "3"}

async def _proxy_agent_sse(client: httpx.AsyncClient, request_id: str):
    try:
        async with client.stream("POST", f"{settings.agent_url}/agent/run", json={}, headers={"x-request-id": request_id}) as response:
            if response.status_code != 200:
                err_str = json.dumps({"error": f"Agent error {response.status_code}"})
                yield f"data: {err_str}\n\n"
                return
            async for chunk in response.aiter_text():
                yield chunk
    except Exception as e:
        log.error("agent_proxy_error", exc=str(e))
        err_str = json.dumps({"error": "Failed to connect to agent"})
        yield f"data: {err_str}\n\n"

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
