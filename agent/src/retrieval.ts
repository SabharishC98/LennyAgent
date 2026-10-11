import { logger } from './logger.js';
import { pool as defaultPool } from './db.js';

export interface RetrievedChunk {
  id: string;
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
    // Exclude meta overview index files so answers come specifically from real interview transcripts
    const ftsQuery = `
      SELECT id, episode, guest, url, position, text,
             ts_rank_cd(to_tsvector('english', text), plainto_tsquery('english', $1)) AS score
      FROM chunks
      WHERE (to_tsvector('english', text) @@ plainto_tsquery('english', $1) OR text ILIKE '%' || $1 || '%')
        AND episode != 'episodes' AND episode != 'README'
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

    // Keyword matching over non-index transcripts
    const words = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['write', 'about', 'essay', 'what', 'tell', 'from'].includes(w));

    if (words.length > 0) {
      const conditions = words.map((_, i) => `text ILIKE '%' || $${i + 1} || '%'`).join(' OR ');
      const fallbackQuery = `
        SELECT id, episode, guest, url, position, text, 0.5 AS score
        FROM chunks
        WHERE (${conditions})
          AND episode != 'episodes' AND episode != 'README'
        ORDER BY position ASC
        LIMIT 5
      `;
      const fallbackRes = await db.query(fallbackQuery, words);
      if (fallbackRes.rows.length > 0) {
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
    }

    return [];
  } catch (err) {
    logger.error({ err, query }, 'Failed to retrieve chunks from database');
    return [];
  }
}
