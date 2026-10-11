import Fastify from 'fastify';
import { logger } from './logger.js';
import { FallbackManager } from './providers/index.js';
import { OpenAICompatibleAdapter } from './providers/openai.js';
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

  const ollama = new OpenAICompatibleAdapter(
    process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434',
    '',
    process.env.OLLAMA_MODEL || 'qwen2.5:7b'
  );

  const groq = new OpenAICompatibleAdapter(
    'https://api.groq.com/openai/v1',
    process.env.GROQ_API_KEY || '',
    process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  );

  const fallbackProviders = process.env.GROQ_API_KEY ? [groq, ollama] : [ollama];
  const manager = new FallbackManager(fallbackProviders);

  const intent = await routeIntent(query);
  let responseText = '';

  if (intent === 'essay') {
    responseText = await write_ship30_essay(query, null, manager);
  } else {
    responseText = await answer_grounded(query, null, manager);
  }

  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  const chunkPayload = JSON.stringify({
    text: responseText,
    intent,
    provider: process.env.GROQ_API_KEY ? 'groq' : 'ollama',
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
