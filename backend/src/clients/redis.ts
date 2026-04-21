import Redis from 'ioredis';
import { logger } from '../config/logger.js';
import env from '../config/env.js';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err: Error) => {
  logger.error({ err }, 'Redis connection error');
});

export { redis };
export default redis;
