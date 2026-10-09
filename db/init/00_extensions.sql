-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Note: Full schema (sessions, messages, artifacts, chunks, retrieval_logs)
-- is created by migrations in Phase 2.
