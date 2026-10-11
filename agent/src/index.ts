import Fastify from 'fastify';
import { logger } from './logger.js';
import { FallbackManager } from './providers/index.js';
import { OpenAICompatibleAdapter } from './providers/openai.js';

const app = Fastify({ logger: false });

app.get('/health', async (_req, reply) => {
  return reply.send({ status: 'ok', service: 'agent', phase: '3' });
});

app.post('/agent/run', async (req: any, reply) => {
  // Setup providers from env
  const ollama = new OpenAICompatibleAdapter(
    process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    '',
    process.env.OLLAMA_MODEL || 'qwen2.5:7b'
  );

  const groq = new OpenAICompatibleAdapter(
    'https://api.groq.com/openai/v1',
    process.env.GROQ_API_KEY || '',
    process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  );

  const fallbackProviders = process.env.LLM_FALLBACK === 'ollama' ? [groq, ollama] : [ollama];
  const manager = new FallbackManager(fallbackProviders);

  // Basic SSE format response (mocked)
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  reply.raw.write('data: {"text": "Processing your request..."}\n\n');
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
