import { logger } from './logger.js';
import { pool as defaultPool } from './db.js';

export interface RetrievedChunk {
  id: number;
  episode: string;
  guest: string;
  url: string;
  position: number;
  text: string;
  score: number;
}

export async function hybridRetrieve(query: string, activePool?: any): Promise<RetrievedChunk[]> {
  const db = activePool || defaultPool;
  logger.info({ query }, 'Executing hybrid retrieve from postgres chunks');

  try {
    // 1. Full-text search using PostgreSQL tsvector / plainto_tsquery
    const ftsQuery = `
      SELECT id, episode, guest, url, position, text,
             ts_rank_cd(to_tsvector('english', text), plainto_tsquery('english', $1)) AS score
      FROM chunks
      WHERE to_tsvector('english', text) @@ plainto_tsquery('english', $1)
         OR text ILIKE '%' || $1 || '%'
      ORDER BY score DESC, position ASC
      LIMIT 5
    `;

    const res = await db.query(ftsQuery, [query]);
    if (res.rows.length > 0) {
      return res.rows.map((r: any) => ({
        id: r.id,
        episode: r.episode,
        guest: r.guest,
        url: r.url,
        position: r.position,
        text: r.text,
        score: parseFloat(r.score) || 1.0,
      }));
    }

    // 2. Keyword fallback: split query words and match any prominent word
    const words = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (words.length > 0) {
      const conditions = words.map((_, i) => `text ILIKE '%' || $${i + 1} || '%'`).join(' OR ');
      const fallbackQuery = `
        SELECT id, episode, guest, url, position, text, 0.5 AS score
        FROM chunks
        WHERE ${conditions}
        LIMIT 5
      `;
      const fallbackRes = await db.query(fallbackQuery, words);
      return fallbackRes.rows.map((r: any) => ({
        id: r.id,
        episode: r.episode,
        guest: r.guest,
        url: r.url,
        position: r.position,
        text: r.text,
        score: 0.5,
      }));
    }

    return [];
  } catch (err) {
    logger.error({ err, query }, 'Failed to retrieve chunks from database');
    return [];
  }
}
