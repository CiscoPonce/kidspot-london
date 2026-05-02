import { redis } from '../clients/redis.js';

const LOCK_KEY = 'kidspot:ingest:stale:lock';
const LOCK_TTL_SEC = 3600;

export class StaleIngestLockedError extends Error {
  override name = 'StaleIngestLockedError';

  constructor(message = 'Another stale ingest is already running') {
    super(message);
  }
}

export async function acquireStaleIngestLock(): Promise<boolean> {
  const ok = await redis.set(LOCK_KEY, String(Date.now()), 'EX', LOCK_TTL_SEC, 'NX');
  return ok === 'OK';
}

export async function releaseStaleIngestLock(): Promise<void> {
  await redis.del(LOCK_KEY);
}

export async function withStaleIngestLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!(await acquireStaleIngestLock())) {
    throw new StaleIngestLockedError();
  }
  try {
    return await fn();
  } finally {
    await releaseStaleIngestLock();
  }
}
