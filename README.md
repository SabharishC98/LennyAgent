# Lenny Growth Assistant

A grounded internal assistant over Lenny's Podcast transcripts.

## Architecture
Two-service design: Python 3.11 FastAPI API gateway and Node 20 TypeScript Agent service.
Data is persisted in PostgreSQL with pgvector for semantic search. The frontend is React + Vite.

## Prerequisites
- Docker Desktop
- Node 20
- Python 3.11
- Ollama (MANDATORY for local demo. The app will NOT work without Ollama running locally.)

## Installation & Setup
1. Copy .env.example to .env and fill in the required keys.
2. Run ollama pull nomic-embed-text and ollama pull qwen2.5:7b locally.
3. Start the stack: make up
4. Ingest transcripts: make ingest (requires TRANSCRIPT_REPO_URL in .env).

## Run Commands
- make up - Start services
- make ingest - Run ingestion
- make refresh - Re-ingest changed files
- make test - Run full test suite
- make eval - Run evaluation harness

## Environment Variables
- LLM_PROVIDER: groq | ollama | anthropic
- LLM_FALLBACK: Comma-separated list for fallback chain (e.g., groq,ollama)
- GROQ_API_KEY: API key for Groq
- OLLAMA_BASE_URL: URL for local Ollama (e.g., http://host.docker.internal:11434)
- DATABASE_URL: PostgreSQL connection string

## Evaluation Results
**PENDING**: Full evaluation requires a live Ollama host and valid API keys which are unavailable in the current test sandbox.

## Troubleshooting
- **Ollama unreachable:** Ensure host.docker.internal is resolving in Docker, or change OLLAMA_BASE_URL to your host IP.
- **Missing API key:** Ensure .env is configured. The system will gracefully fall back if an alternative is set.

## Extension Guide
- **Add a Skill:** Create gent/src/skills/new_skill.ts and add logic to gent/src/router.ts.
- **Add a Provider:** Implement the LLMProvider interface in gent/src/providers/.

## Demo Video
[PLACEHOLDER - not yet recorded]
