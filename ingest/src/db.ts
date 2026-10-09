import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://lenny:lenny@localhost:5432/lenny',
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle client');
  process.exit(-1);
});
