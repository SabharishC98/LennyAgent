import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://lenny:lenny@db:5432/lenny',
});

pool.on('error', (err) => {
  logger.error({ err }, 'Database pool unexpected error on idle client');
});
