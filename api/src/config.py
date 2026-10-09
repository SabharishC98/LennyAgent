"""Application configuration via environment variables."""
from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # LLM provider
    llm_provider: Literal["ollama", "groq", "anthropic"] = "groq"
    llm_fallback: str = "ollama"  # comma-separated ordered list

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Ollama
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "qwen2.5:7b"

    # Embeddings (always Ollama nomic-embed-text)
    embed_model: str = "nomic-embed-text"

    # Anthropic (optional)
    anthropic_api_key: str = ""

    # Database
    database_url: str = "postgresql://lenny:lenny@db:5432/lenny"

    # Agent service
    agent_url: str = "http://agent:8001"

    # CORS
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"]
    )

    # Logging
    log_level: str = "INFO"


settings = Settings()
