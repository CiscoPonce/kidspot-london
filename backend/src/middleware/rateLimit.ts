import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import type { RedisReply } from "rate-limit-redis";
import { redis } from "../clients/redis.js";
import { logger } from "../config/logger.js";

/**
 * Global API rate limiter (60 requests per minute per IP)
 * Multi-instance safe via Redis
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redis.call(args[0]!, ...args.slice(1)) as Promise<RedisReply>,
    prefix: "rl:api:",
  }),
  handler: (req, res, _next, options) => {
    logger.warn(
      {
        ip: req.ip,
        method: req.method,
        url: req.url,
        requestId: req.id,
      },
      "Rate limit exceeded"
    );
    res.status(options.statusCode).send(options.message);
  },
});

export const braveSearchLimiter = async () => {
  const key = "lock:brave-search";
  let acquired = false;
  let attempts = 0;
  const maxAttempts = 50;

  while (!acquired && attempts < maxAttempts) {
    const result = await redis.set(key, "locked", "PX", 1000, "NX");
    if (result === "OK") {
      acquired = true;
    } else {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  if (!acquired) {
    logger.warn("Failed to acquire Brave Search lock after multiple attempts");
    throw new Error("Brave Search quota busy, try again later");
  }
};

export default apiLimiter;
