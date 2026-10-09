.PHONY: up down test ingest refresh eval build install help

## Default target
help:
	@echo "Lenny Growth Assistant — Make targets"
	@echo ""
	@echo "  make up       Start all services with Docker Compose"
	@echo "  make down     Stop all services"
	@echo "  make test     Run all tests (pytest + Vitest + Playwright)"
	@echo "  make ingest   Run transcript ingestion (requires TRANSCRIPT_REPO_URL)"
	@echo "  make refresh  Re-ingest changed transcripts only"
	@echo "  make eval     Run evaluation harness (Phase 7)"
	@echo "  make build    Build all services"
	@echo "  make install  Install all dependencies"
	@echo ""
	@echo "Prerequisites:"
	@echo "  - Docker Desktop running"
	@echo "  - Ollama running locally (ollama pull nomic-embed-text && ollama pull qwen2.5:7b)"
	@echo "  - .env file configured (copy from .env.example)"

up:
	@echo "Starting services..."
	docker compose up -d --build
	@echo "Services started. API: http://localhost:8000, Web: http://localhost:5173"

down:
	docker compose down

build:
	docker compose build

install:
	@echo "Installing Node.js dependencies..."
	npm install
	@echo "Installing Python dependencies..."
	@echo "Run: cd api && pip install -r requirements-dev.txt"
	@echo "Or with uv: cd api && uv pip install -r requirements-dev.txt"

test:
	@echo "=== Running Python API tests ==="
	cd api && python -m pytest tests/ -v
	@echo "=== Running Agent Vitest ==="
	cd agent && npm test
	@echo "=== Running Ingest Vitest ==="
	cd ingest && npm test
	@echo "=== Running Web Vitest ==="
	cd web && npm test
	@echo "=== Playwright E2E (requires running services) ==="
	@echo "Run 'make up' first, then: cd web && npm run test:e2e"

ingest:
	@echo "Running transcript ingestion..."
	@if [ -z "$$TRANSCRIPT_REPO_URL" ]; then \
		echo "ERROR: TRANSCRIPT_REPO_URL is not set. Configure it in .env"; \
		exit 1; \
	fi
	@echo "NOTE: Ingestion not yet implemented (Phase 2). TRANSCRIPT_REPO_URL: $$TRANSCRIPT_REPO_URL"
	docker compose --profile ingest run --rm ingest

refresh:
	@echo "Running transcript refresh (changed files only)..."
	@echo "NOTE: Refresh not yet implemented (Phase 2)."
	docker compose --profile ingest run --rm -e REFRESH_ONLY=true ingest

eval:
	@echo "Running evaluation harness..."
	cd agent && npx tsx src/eval.ts

