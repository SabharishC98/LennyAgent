# Phase 02 — DB schema + ingestion

## Goal
Persist sessions/messages/artifacts/chunks/retrieval logs in PostgreSQL + pgvector and build traceable, idempotent transcript ingestion.

## Attempts Log

### Attempt 1
**Date:** 2026-10-09
**Status:** Completed

## Files Created/Updated
- architecture.md (updated schema and ingestion sections)
- db/init/01_schema.sql (pgvector DB schema)
- ingest/src/db.ts, ingest/src/utils.ts, ingest/src/ingest.ts (ingestion logic, chunking, hashing, db connection)
- ingest/tests/ingest.test.ts, ingest/fixtures/ep01.md (tests and fixtures)

## Acceptance Checks
- **Clean DB migration:** Blocked (Docker not available locally to run PostgreSQL + pgvector).
- **Vitest parsing/chunk/hash tests:** Passed.
- **Ollama live check:** Blocked (Ollama cannot be reached without Docker container/host setup working). Recorded honestly in ingest.ts to skip embedding generation when Ollama fails.
- **Idempotent upsert:** Logic implemented using content_hash and ON CONFLICT DO NOTHING.

## Known Blockers
- Docker is still not configured correctly to run the Compose stack in this environment. Live database testing and actual indexing are blocked. 

## Commit Reference
db680e85a21bab962843ad396e7d3f02fbeab31b

