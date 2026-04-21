import Redis from 'ioredis';
import { logger } from '../config/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
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
