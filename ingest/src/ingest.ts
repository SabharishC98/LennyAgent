/**
 * Lenny Growth Assistant — Transcript Ingestion
 * Phase 1 scaffold: placeholder only. Full implementation in Phase 2.
 *
 * Flows (Phase 2):
 *  1. Clone/pull transcript repository
 *  2. Parse episodes and speaker/guest metadata
 *  3. Chunk ~500 tokens / ~80 token overlap
 *  4. Embed with Ollama nomic-embed-text
 *  5. Upsert to PostgreSQL/pgvector with content hash (idempotent)
 *  6. Refresh: re-ingest changed files only
 */
import { logger } from './logger.js';

const TRANSCRIPT_REPO_URL = process.env.TRANSCRIPT_REPO_URL;

async function main(): Promise<void> {
  logger.info('Ingest service starting (Phase 1 scaffold)');

  if (!TRANSCRIPT_REPO_URL) {
    logger.error(
      'TRANSCRIPT_REPO_URL is not configured. ' +
      'Set this environment variable to your transcript repository URL. ' +
      'Full ingestion requires Phase 2 implementation.'
    );
    process.exit(1);
  }

  logger.warn(
    { phase: 1 },
    'Ingestion not yet implemented. This scaffold will be completed in Phase 2.'
  );
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Ingest fatal error');
  process.exit(1);
});
