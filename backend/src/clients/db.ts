import { Pool } from 'pg';
import { logger } from '../config/logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kidspot_admin:password@localhost:5432/kidspot',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL');
});

pool.on('error', (err: Error) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};

export default db;
