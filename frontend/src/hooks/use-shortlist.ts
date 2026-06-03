'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { Venue } from '@/lib/api';

/**
 * Party Shortlist (Phase 18C FE-04).
 *
 * localStorage-backed, no-auth. Stores a lightweight Venue snapshot so the
 * Saved / Compare / shared-link views render without a refetch. The interface
 * (add/remove/toggle/has/clear) is API-ready: a Phase 19 server store can drop
 * in behind it without changing call sites.
 */

const KEY = 'kidspot:shortlist:v1';
const EVENT = 'kidspot:shortlist:change';

let cache: Venue[] | null = null;
const EMPTY: Venue[] = [];

function read(): Venue[] {
  if (cache) return cache;
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Venue[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: Venue[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode — keep in-memory */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  const onChange = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

const sameId = (a: Venue['id'], b: Venue['id']) => String(a) === String(b);

export function useShortlist() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const has = useCallback(
    (id: Venue['id']) => items.some((v) => sameId(v.id, id)),
    [items],
  );

  const add = useCallback((venue: Venue) => {
    const cur = read();
    if (!cur.some((v) => sameId(v.id, venue.id))) write([...cur, venue]);
  }, []);

  const remove = useCallback((id: Venue['id']) => {
    write(read().filter((v) => !sameId(v.id, id)));
  }, []);

  const toggle = useCallback((venue: Venue) => {
    const cur = read();
    if (cur.some((v) => sameId(v.id, venue.id))) {
      write(cur.filter((v) => !sameId(v.id, venue.id)));
    } else {
      write([...cur, venue]);
    }
  }, []);

  const clear = useCallback(() => write([]), []);

  return { items, count: items.length, has, add, remove, toggle, clear };
}
