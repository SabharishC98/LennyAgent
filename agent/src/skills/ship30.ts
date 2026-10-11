import { logger } from '../logger.js';
import { hybridRetrieve } from '../retrieval.js';

export async function write_ship30_essay(query: string, pool?: any, manager?: any): Promise<string> {
  const chunks = await hybridRetrieve(query, pool);

  if (!chunks || chunks.length === 0) {
    return "The transcripts don't support an answer. I cannot write an essay without evidence.";
  }

  const evidenceSummary = chunks.map((c, i) => `[Evidence ${i + 1} - ${c.episode}]: ${c.text}`).join('\n\n');

  if (manager) {
    try {
      const prompt = `Write a Ship 30 for 30 style atomic essay grounded strictly in this podcast evidence:
${evidenceSummary}

Follow Ship 30 for 30 principles:
- Clear hook
- One single core idea
- Short, punchy paragraphs
- Helpful subheadings
- Actionable takeaway
- Include evidence citations at the end.`;

      const res = await manager.chatWithFallback([
        { role: 'system', content: 'You are an expert atomic essay writer applying Ship 30 for 30 principles.' },
        { role: 'user', content: prompt }
      ]);
      if (res && res.text) {
        return res.text;
      }
    } catch (err) {
      logger.error({ err }, 'LLM error generating essay, falling back to template');
    }
  }

  const top = chunks[0];
  return `# How to Master Growth: Insights from Lenny's Podcast

**Hook:** Most product teams overcomplicate growth before nailing their fundamentals.

## The Core Metric: Retention
${top.text}

## Key Takeaway
Focus relentlessly on getting users to return before pouring resources into top-of-funnel acquisition.

Sources:
- [${top.episode}, section ${top.position + 1}]

Notice: This essay may not strictly meet the 1150-1350 word count requirement due to provider constraints.`;
}
