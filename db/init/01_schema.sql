-- Phase 2 Schema Definition

-- Enable required extensions (already done in 00_extensions.sql, but ensuring safety)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    artifact_id UUID, -- References artifacts(id), added properly below or left soft-linked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode TEXT NOT NULL,
    guest TEXT,
    url TEXT,
    path TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    text TEXT NOT NULL,
    embedding vector(768), -- nomic-embed-text uses 768 dimensions
    content_hash TEXT UNIQUE NOT NULL,
    fts tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_fts_idx ON chunks USING GIN (fts);

CREATE TABLE IF NOT EXISTS retrieval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    chunks_retrieved JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
