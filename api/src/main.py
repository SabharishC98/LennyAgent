"""
Lenny Growth Assistant — FastAPI Gateway
Phase 1 scaffold: health endpoint only.
Full endpoints implemented in Phases 3-6.
"""
from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .logging_config import configure_logging

configure_logging()
log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("lenny_api_startup", version="0.1.0", phase="scaffold")
    yield
    log.info("lenny_api_shutdown")


app = FastAPI(
    title="Lenny Growth Assistant API",
    description="Grounded assistant over Lenny's Podcast transcripts",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next) -> Response:
    """Accept or generate x-request-id and propagate it."""
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    with structlog.contextvars.bound_contextvars(request_id=request_id):
        response: Response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


@app.get("/health")
async def health_check() -> dict:
    """
    Health endpoint.
    Phase 1: returns scaffold status only.
    Deep health checks (DB, agent, Ollama, index size) implemented in Phase 6.
    """
    return {
        "status": "ok",
        "service": "lenny-api",
        "phase": "scaffold",
        "note": "Deep health implemented in Phase 6",
    }


@app.get("/config")
async def get_config() -> dict:
    """
    Config endpoint.
    Phase 1: returns scaffold status only.
    Full provider/model/fallback config implemented in Phase 3.
    """
    return {
        "provider": settings.llm_provider,
        "phase": "scaffold",
        "note": "Full config endpoint implemented in Phase 3",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request.headers.get("x-request-id", "unknown")
    log.error("unhandled_exception", exc=str(exc), request_id=request_id)
    return JSONResponse(
        status_code=500,
        content={
            "code": "internal_error",
            "message": "An internal error occurred",
            "request_id": request_id,
        },
    )
