import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('bullmq', () => {
  return {
    Worker: vi.fn().mockImplementation(function (this: any) {
      this.on = vi.fn();
      this.close = vi.fn();
    }),
    Job: vi.fn()
  };
});

vi.mock('../clients/redis.js', () => ({
  redis: {}
}));

vi.mock('../config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../config/env.js', () => ({
  env: { REDIS_URL: 'redis://localhost:6379' },
  default: { REDIS_URL: 'redis://localhost:6379' }
}));

describe('Worker Unit Tests', () => {
  it('should initialize the worker', async () => {
    const { Worker } = await import('bullmq');
    await import('../../worker.js'); // side effect
    
    expect(Worker).toHaveBeenCalled();
  });
});
