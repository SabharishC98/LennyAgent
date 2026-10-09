import Fastify from 'fastify';
import { logger } from './logger.js';

const app = Fastify({
  logger: false, // use pino directly
});

app.get('/health', async (_req, reply) => {
  return reply.send({
    status: 'ok',
    service: 'agent',
    phase: 'scaffold - Phase 1 only',
    note: 'Full implementation in Phases 3-4',
  });
});

// POST /agent/run - placeholder; implemented in Phase 3
app.post('/agent/run', async (_req, reply) => {
  reply.status(501);
  return reply.send({
    code: 'not_implemented',
    message: 'Agent run endpoint not implemented until Phase 3',
  });
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
