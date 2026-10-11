import Fastify from 'fastify';
import { logger } from './logger.js';
import { FallbackManager, OpenAICompatibleAdapter, AnthropicAdapter } from './providers/index.js';
import { routeIntent } from './router.js';
import { answer_grounded } from './skills/answer_grounded.js';
import { write_ship30_essay } from './skills/ship30.js';

const app = Fastify({ logger: false });

app.get('/health', async (_req, reply) => {
  return reply.send({ status: 'ok', service: 'agent', phase: '6' });
});

app.post('/agent/run', async (req: any, reply) => {
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
    process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  );

  // 3. Anthropic Claude (Optional Cloud SDK)
  const anthropic = new AnthropicAdapter(
    process.env.ANTHROPIC_API_KEY || '',
    'claude-3-5-sonnet-20241022'
  );

  // Build provider chain according to environment configuration
  const providerChain: { provider: any; name: string }[] = [];

  const mainProvider = (process.env.LLM_PROVIDER || 'groq').toLowerCase();
  if (mainProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    providerChain.push({ provider: anthropic, name: 'anthropic' });
  } else if (mainProvider === 'groq' && process.env.GROQ_API_KEY) {
    providerChain.push({ provider: groq, name: 'groq' });
  }

  // Fallback chain
  if (process.env.GROQ_API_KEY && !providerChain.some(p => p.name === 'groq')) {
    providerChain.push({ provider: groq, name: 'groq' });
  }
  providerChain.push({ provider: ollama, name: 'ollama' });

  const manager = new FallbackManager(providerChain);

  const intent = await routeIntent(query);
  let responseText = '';

  if (intent === 'essay') {
    responseText = await write_ship30_essay(query, null, manager, history);
  } else {
    responseText = await answer_grounded(query, null, manager, history);
  }

  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  const chunkPayload = JSON.stringify({
    text: responseText,
    intent,
    provider: providerChain[0]?.name || 'ollama',
    artifact: intent === 'essay' ? `<h1>Ship 30 Essay</h1><p>${responseText.replace(/\n\n/g, '</p><p>')}</p>` : null
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
