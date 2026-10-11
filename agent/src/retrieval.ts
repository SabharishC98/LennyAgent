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

  // Strip stop words and task instructions from the query for clean keyword matching
  const stopWords = new Set([
    'write', 'an', 'essay', 'about', 'how', 'what', 'tell', 'me', 'the', 'from',
    'guest', 'title', 'episode', 'build', 'builds', 'interview', 'podcast', 'with', 'and'
  ]);

  const cleanWords = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  try {
    // 1. If we have specific search terms (like 'netflix', 'culture', 'excellence')
    if (cleanWords.length > 0) {
      // Build conditions counting how many query words match in text or episode name
      // Weight matches in episode name heavily (3x) because user often specifies guest or topic
      const matchScoreExpr = cleanWords
        .map((_, i) => `(CASE WHEN text ILIKE '%' || $${i + 1} || '%' THEN 1 ELSE 0 END + CASE WHEN episode ILIKE '%' || $${i + 1} || '%' THEN 3 ELSE 0 END)`)
        .join(' + ');

      const filterConditions = cleanWords
        .map((_, i) => `(text ILIKE '%' || $${i + 1} || '%' OR episode ILIKE '%' || $${i + 1} || '%')`)
        .join(' OR ');

      const querySql = `
        SELECT id, episode, guest, url, position, text,
               (${matchScoreExpr}) AS match_score
        FROM chunks
        WHERE (${filterConditions})
          AND path LIKE '%/episodes/%'
          AND episode != 'episodes' AND episode != 'README'
        ORDER BY match_score DESC, position ASC
        LIMIT 6;
      `;

      const res = await db.query(querySql, cleanWords);
      if (res.rows.length > 0 && res.rows[0].match_score > 0) {
        return res.rows.map((r: any) => ({
          id: r.id,
          episode: r.episode,
          guest: r.guest,
          url: r.url,
          position: r.position,
          text: r.text,
          score: parseFloat(r.match_score) || 1.0,
        }));
      }
    }

    // 2. Fallback to broad search if clean words empty
    const fallbackSql = `
      SELECT id, episode, guest, url, position, text, 0.5 AS match_score
      FROM chunks
      WHERE path LIKE '%/episodes/%'
        AND text ILIKE '%' || $1 || '%'
      ORDER BY position ASC
      LIMIT 5;
    `;
    const fallbackRes = await db.query(fallbackSql, [query]);
    return fallbackRes.rows.map((r: any) => ({
      id: r.id,
      episode: r.episode,
      guest: r.guest,
      url: r.url,
      position: r.position,
      text: r.text,
      score: 0.5,
    }));
  } catch (err) {
    logger.error({ err, query }, 'Failed to retrieve chunks from database');
    return [];
  }
}
