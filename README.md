# Lenny Growth Assistant

> Grounded Q&A, essay generation, and artifact viewer over Lenny Rachitsky's Podcast transcripts.

> [!IMPORTANT]
> **Ollama is MANDATORY for the local demo.** The app will NOT work without Ollama running locally. See [Ollama Setup](#ollama-setup) below.

> [!NOTE]
> This repository is local only. Do not publish without explicit confirmation.

---

## Overview

Lenny Growth Assistant is an internal assistant that lets product managers, growth practitioners, and founders:

- **Ask questions** about topics from Lenny's Podcast — with citations back to specific episodes
- **Generate essays** in Ship 30 format, grounded in transcript content
- **Produce artifacts** — versioned Markdown/HTML outputs with a sandboxed viewer

The system uses a hybrid retrieval pipeline (BM25 + pgvector) and supports multiple LLM providers with automatic fallback.

---

## Architecture

Two-service design with a React frontend:

```
Browser (React/Vite)
  └─► FastAPI Gateway (Python 3.11, :8000)
        ├─► PostgreSQL + pgvector (transcript chunks, sessions, artifacts)
        └─► TypeScript Agent (Node 20, :8001)
              ├─► Ollama (local, host.docker.internal:11434)
              ├─► Groq API (cloud, free tier)
              └─► Anthropic API (optional, paid)
```

See [architecture.md](./architecture.md) for full component diagram and design decisions.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Docker Desktop** | Latest | Must be running before `make up` |
| **Node.js** | ≥ 20.0.0 | For local development |
| **Python** | 3.11 | For local API development |
| **Ollama** | Latest | **MANDATORY** — see setup below |

---

## Ollama Setup

1. Install Ollama from [ollama.com](https://ollama.com)
2. Start the Ollama service
3. Pull the required models:

```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:7b
```

> [!WARNING]
> If Ollama is not running, the app cannot generate embeddings and all Q&A will fail, even if using Groq or Anthropic for inference.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `LLM_PROVIDER` | Yes | `groq` | LLM provider: `ollama`, `groq`, or `anthropic` |
| `LLM_FALLBACK` | Yes | `ollama` | Fallback chain (comma-separated) |
| `GROQ_API_KEY` | For Groq | _(empty)_ | Get from [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model name |
| `OLLAMA_BASE_URL` | No | `http://host.docker.internal:11434` | Ollama endpoint |
| `OLLAMA_MODEL` | No | `qwen2.5:7b` | Ollama model name |
| `EMBED_MODEL` | No | `nomic-embed-text` | Embedding model (do not change) |
| `ANTHROPIC_API_KEY` | For Anthropic | _(empty)_ | Get from [console.anthropic.com](https://console.anthropic.com) |
| `DATABASE_URL` | Managed | `postgresql://lenny:lenny@db:5432/lenny` | Set by Docker Compose |
| `AGENT_URL` | Managed | `http://agent:8001` | Set by Docker Compose |
| `TRANSCRIPT_REPO_URL` | For ingest | _(empty)_ | Git URL of transcript repository |

---

## Run Commands

```bash
# Start all services
make up

# Run transcript ingestion (requires TRANSCRIPT_REPO_URL in .env)
make ingest

# Run all tests
make test

# Run evaluation harness (Phase 7 — not yet implemented)
make eval

# Re-ingest changed transcripts only
make refresh

# Stop all services
make down
```

---

## Tests

| Suite | Tool | Command |
|---|---|---|
| API unit tests | pytest | `cd api && python -m pytest tests/ -v` |
| Agent unit tests | Vitest | `cd agent && npm test` |
| Ingest unit tests | Vitest | `cd ingest && npm test` |
| Web unit tests | Vitest | `cd web && npm test` |
| UI smoke tests | Playwright | `cd web && npm run test:e2e` (requires `make up` first) |

---

## Evaluation Results

> [!NOTE]
> **PENDING** — Evaluation harness not yet implemented. Will be updated in Phase 7.

| Metric | Target | Result |
|---|---|---|
| Citation accuracy | >85% | PENDING |
| Out-of-scope refusal | 100% | PENDING |
| P50 latency (Groq) | <3s | PENDING |
| P50 latency (Ollama) | <10s | PENDING |

---

## Troubleshooting

### Ollama not reachable
```
Error: connect ECONNREFUSED host.docker.internal:11434
```
- Ensure Ollama is running: `ollama serve`
- On Linux: add `--add-host=host.docker.internal:host-gateway` to Docker run args
- Check `OLLAMA_BASE_URL` in `.env`

### DB not ready
```
Error: could not connect to server: Connection refused
```
- Wait for the DB healthcheck: `docker compose ps` should show `db` as `healthy`
- Retry: `make up` (compose waits for `service_healthy`)

### API key missing
```
Warning: GROQ_API_KEY is empty — falling back to Ollama
```
- This is expected if you haven't set a Groq key
- Ensure `LLM_FALLBACK=ollama` is set
- Ensure Ollama is running (see above)

---

## Extension Guide

### Adding a New Skill

1. Create `agent/src/skills/your-skill.ts`
2. Implement the `Skill` interface (Phase 3)
3. Register in `agent/src/router.ts`
4. Add tests in `agent/tests/your-skill.test.ts`

### Adding a New Provider

1. Implement the `LLMProvider` interface in `agent/src/providers/your-provider.ts`
2. Add provider name to `LLM_PROVIDER` allowed values in `api/src/config.py`
3. Register in provider factory (Phase 3)
4. Add to `.env.example` with empty API key

---

## Demo

> [!NOTE]
> **[PLACEHOLDER]** Demo video not yet recorded. Will be added after Phase 5 UI implementation.

---

## Repository Structure

```
lenny-growth-assistant/
├── PRD.md                  # Product Requirements Document
├── design.md               # UI/UX design document
├── architecture.md         # Architecture and technical decisions
├── Makefile                # Dev workflow commands
├── docker-compose.yml      # All services
├── .env.example            # Config template (commit this, not .env)
├── .gitignore
├── package.json            # npm workspaces root
├── api/                    # FastAPI gateway (Python 3.11)
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── requirements.txt
├── agent/                  # LLM orchestration (Node 20 + TypeScript)
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── ingest/                 # Transcript ingestion (Node 20 + TypeScript)
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── web/                    # React + Vite + Tailwind frontend
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── db/
│   └── init/               # SQL run at DB container startup
├── agent-transcripts/
│   └── phase-01.md         # Phase execution log
└── .github/
    └── workflows/
        └── ci.yml          # GitHub Actions CI
```
