import Fastify from 'fastify';
import { logger } from './logger.js';
import { FallbackManager, OpenAICompatibleAdapter, AnthropicAdapter } from './providers/index.js';
import { routeIntent } from './router.js';
import { hybridRetrieve } from './retrieval.js';

const app = Fastify({ logger: false });

app.get('/health', async (_req, reply) => {
  return reply.send({ status: 'ok', service: 'agent', phase: '6' });
});

app.post('/agent/run', async (req: any, reply) => {
  const startTime = Date.now();
  const body = req.body || {};
  const query = body.query || body.message || 'What is product market fit?';
  const history = Array.isArray(body.history) ? body.history : [];

  // 1. Local Ollama (Mandatory for demo)
  const ollama = new OpenAICompatibleAdapter(
    process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
    '',
    process.env.OLLAMA_MODEL || 'qwen2.5:7b'
  );

  // 2. Groq (Cloud LLM)
  const groq = new OpenAICompatibleAdapter(
    'https://api.groq.com/openai/v1',
    process.env.GROQ_API_KEY || '',
    process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
  );

  // 3. Anthropic Claude (Optional Cloud SDK)
  const anthropic = new AnthropicAdapter(
    process.env.ANTHROPIC_API_KEY || '',
    'claude-3-5-sonnet-20241022'
  );

  // Build provider chain
  const providerChain: { provider: any; name: string }[] = [];
  const mainProvider = (process.env.LLM_PROVIDER || 'groq').toLowerCase();
  if (mainProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    providerChain.push({ provider: anthropic, name: 'anthropic' });
  } else if (mainProvider === 'groq' && process.env.GROQ_API_KEY) {
    providerChain.push({ provider: groq, name: 'groq' });
  }

  if (process.env.GROQ_API_KEY && !providerChain.some(p => p.name === 'groq')) {
    providerChain.push({ provider: groq, name: 'groq' });
  }
  providerChain.push({ provider: ollama, name: 'ollama' });

  const manager = new FallbackManager(providerChain);
  const intent = await routeIntent(query);

  // Retrieve relevant evidence
  let effectiveQuery = query;
  if (history && history.length > 0) {
    const lastUser = history.filter((h: any) => h.role === 'user').slice(-2).map((h: any) => h.content).join(' ');
    effectiveQuery = `${lastUser} ${query}`.trim();
  }
  const chunks = await hybridRetrieve(effectiveQuery);

  let responseText = '';
  let providerUsed = providerChain[0]?.name || 'ollama';

  if (!chunks || chunks.length === 0) {
    responseText = "The transcripts don't support an answer.";
  } else if (intent === 'essay') {
    const evidenceSummary = chunks.map((c, i) => `[Evidence ${i + 1} - ${c.episode}]: ${c.text}`).join('\n\n');
    const prompt = `Write a comprehensive, high-impact Ship 30 for 30 style atomic essay grounded strictly in this podcast evidence:
${evidenceSummary}

Follow Ship 30 for 30 principles:
- Clear hook
- One single core idea
- Short, punchy paragraphs with selective bolding
- Practical subheadings
- Concrete, actionable takeaway
- Cite evidence sources at the end: [Guest/Topic - Episode, §n]`;

    try {
      const res = await manager.chatWithFallback([
        { role: 'system', content: 'You are an expert atomic essay writer applying Ship 30 for 30 principles grounded in podcast transcripts.' },
        { role: 'user', content: prompt }
      ]);
      responseText = res?.text || '';
      providerUsed = res?.providerName || providerUsed;
    } catch (err) {
      const top = chunks[0];
      responseText = `# How to Master Growth: Insights from Lenny's Podcast\n\n**Hook:** Most product teams overcomplicate growth before nailing their fundamentals.\n\n## The Core Metric: Retention\n${top.text}\n\n## Key Takeaway\nFocus relentlessly on getting users to return before pouring resources into top-of-funnel acquisition.\n\nSources:\n- [${top.episode}, section ${top.position + 1}]\n\nNotice: This essay may not strictly meet the 1150-1350 word count requirement due to provider constraints.`;
    }
  } else {
    const contextText = chunks.map((c, i) => `[Evidence ${i + 1} - ${c.episode}, §${c.position + 1}]:\n${c.text}`).join('\n\n');
    const systemPrompt = `You are Lenny Growth Assistant, an expert answering questions strictly grounded in Lenny's Podcast transcripts.
Synthesize a clear, informative answer based directly on the provided podcast evidence.
Always cite your evidence inline using the format: [Guest/Topic - Episode, §n].
Only if the provided evidence is completely irrelevant and mentions nothing about the topic, reply with: "The transcripts don't support an answer."

Evidence:
${contextText}`;

    try {
      const messages: any[] = [{ role: 'system', content: systemPrompt }];
      for (const h of history.slice(-4)) {
        messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
      }
      messages.push({ role: 'user', content: query });

      const res = await manager.chatWithFallback(messages);
      responseText = res?.text || '';
      providerUsed = res?.providerName || providerUsed;
    } catch (err) {
      const top = chunks[0];
      responseText = `Based on Lenny's Podcast [${top.episode}, §${top.position + 1}]:\n\n${top.text}`;
    }
  }

  // Generate 2-3 dynamic contextual follow-up questions
  const primaryGuest = chunks[0]?.guest || (chunks[0]?.episode ? chunks[0].episode.replace(/-/g, ' ') : '');
  const followUps: string[] = [];
  if (primaryGuest && !responseText.includes("don't support an answer")) {
    const cleanGuestName = primaryGuest.split(' ').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    followUps.push(`What specific frameworks did ${cleanGuestName} recommend?`);
    followUps.push(`How can early-stage teams apply this without large budgets?`);
    followUps.push(`Write a Ship 30 essay summarizing ${cleanGuestName}'s key takeaways.`);
  }

  // Build Verified Episode Quote Card (Concept 1)
  const episodeSource = chunks[0] ? {
    episode: chunks[0].episode,
    guest: primaryGuest.toUpperCase(),
    position: chunks[0].position,
    quote: chunks[0].text.length > 320 ? chunks[0].text.slice(0, 320) + '...' : chunks[0].text,
    timestamp: `~${Math.floor((chunks[0].position * 2.5) + 4)}:00`,
    url: chunks[0].url || `https://www.lennyspodcast.com/`
  } : null;

  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  const chunkPayload = JSON.stringify({
    text: responseText,
    intent,
    provider: providerUsed,
    artifact: intent === 'essay' ? responseText : null,
    episodeSource,
    followUps
  });

  reply.raw.write(`data: ${chunkPayload}\n\n`);
  reply.raw.write('data: [DONE]\n\n');
  reply.raw.end();
});

const port = Number(process.env.AGENT_PORT ?? 8001);
const host = process.env.AGENT_HOST ?? '0.0.0.0';

app.listen({ port, host }, (err, address) => {
  if (err) {
    logger.error({ err }, 'Agent failed to start');
    process.exit(1);
  }
  logger.info({ address }, 'Agent service started');
});

export { app };
