import { hybridRetrieve } from '../retrieval.js';
import { logger } from '../logger.js';

export async function answer_grounded(query: string, pool?: any, providerManager?: any): Promise<string> {
  const chunks = await hybridRetrieve(query, pool);

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
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ];
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
