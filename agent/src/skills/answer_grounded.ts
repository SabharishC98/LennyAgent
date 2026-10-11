import { hybridRetrieve } from '../retrieval.js';
import { logger } from '../logger.js';

export async function answer_grounded(
  query: string,
  pool?: any,
  providerManager?: any,
  history?: Array<{ role: string; content: string }>
): Promise<string> {
  // If there is preceding history, compose follow-up context into the search query
  let effectiveQuery = query;
  if (history && history.length > 0) {
    const lastUserTurn = history.filter((h) => h.role === 'user').slice(-2).map((h) => h.content).join(' ');
    effectiveQuery = `${lastUserTurn} ${query}`.trim();
  }

  const chunks = await hybridRetrieve(effectiveQuery, pool);

  if (!chunks || chunks.length === 0) {
    return "The transcripts don't support an answer.";
  }

  const contextText = chunks
    .map((c, i) => `[Evidence ${i + 1} - ${c.episode}, §${c.position + 1}]:\n${c.text}`)
    .join('\n\n');

  const systemPrompt = `You are Lenny Growth Assistant, an internal assistant answering questions strictly grounded in Lenny's Podcast transcripts.
Use ONLY the provided transcript evidence to answer the user's question.
Always cite your evidence inline using the format: [Guest/Topic - Episode, §n].
If the evidence does not contain the answer, say exactly: "The transcripts don't support an answer."

Evidence:
${contextText}`;

  if (providerManager) {
    try {
      const messages: any[] = [{ role: 'system', content: systemPrompt }];

      // Include bounded history turns for contextual conversation
      if (history && history.length > 0) {
        for (const h of history.slice(-4)) {
          messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
        }
      }

      messages.push({ role: 'user', content: query });

      const result = await providerManager.chatWithFallback(messages);
      if (result && result.text) {
        return result.text;
      }
    } catch (err) {
      logger.error({ err }, 'Error querying LLM provider, falling back to direct extractive answer');
    }
  }

  const topChunk = chunks[0];
  return `Based on Lenny's Podcast [${topChunk.episode}, §${topChunk.position + 1}]:\n\n${topChunk.text}`;
}
