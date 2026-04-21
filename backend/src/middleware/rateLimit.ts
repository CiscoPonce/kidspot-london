import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../clients/redis';
import { logger } from '../config/logger';

/**
 * Global API rate limiter (60 requests per minute per IP)
 * Multi-instance safe via Redis
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: new RedisStore({
    // @ts-expect-error - ioredis and RedisStore types slightly differ in minor versions
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:api:',
  }),
  handler: (req, res, next, options) => {
    logger.warn({
      ip: req.ip,
      method: req.method,
      url: req.url,
      requestId: req.id,
    }, 'Rate limit exceeded');
    res.status(options.statusCode).send(options.message);
  },
});

/**
 * Brave Search rate limiter (1 request per second globally)
 * Multi-instance safe via Redis lock
 */
export const braveSearchLimiter = async () => {
  const key = 'lock:brave-search';
  let acquired = false;
  let attempts = 0;
  const maxAttempts = 50; // Max 5 seconds wait
  
  while (!acquired && attempts < maxAttempts) {
    // Attempt to acquire lock for 1000ms (NX means only if not exists)
    const result = await redis.set(key, 'locked', 'PX', 1000, 'NX');
    if (result === 'OK') {
      acquired = true;
    } else {
      attempts++;
      // Wait 100ms and retry
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  if (!acquired) {
    logger.warn('Failed to acquire Brave Search lock after multiple attempts');
    throw new Error('Brave Search quota busy, try again later');
  }
};

export default apiLimiter;
