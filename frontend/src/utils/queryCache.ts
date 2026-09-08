/**
 * In-Memory Query Cache with Stale-While-Revalidate (SWR) support
 * Provides 0ms instant tab switching and prevents redundant network bursts.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export const queryCache = {
  /**
   * Retrieves data synchronously from cache if present and not older than TTL
   */
  get<T>(key: string, ttlMs: number = 45000): T | null {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlMs) {
      memoryCache.delete(key);
      return null;
    }
    return entry.data as T;
  },

  /**
   * Stores data in memory cache
   */
  set<T>(key: string, data: T): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  /**
   * Invalidates specific key or keys matching a regex/prefix
   */
  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      memoryCache.clear();
      return;
    }
    for (const key of memoryCache.keys()) {
      if (typeof pattern === 'string') {
        if (key.startsWith(pattern) || key.includes(pattern)) {
          memoryCache.delete(key);
        }
      } else if (pattern.test(key)) {
        memoryCache.delete(key);
      }
    }
  },

  /**
   * Fetch with SWR pattern:
   * Returns cached data immediately if available, then executes fresh fetcher.
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    onFreshData?: (data: T) => void,
    ttlMs: number = 30000
  ): Promise<T> {
    const cached = queryCache.get<T>(key, ttlMs);
    if (cached !== null) {
      // Return cached immediately and revalidate asynchronously in background
      fetcher()
        .then((fresh) => {
          queryCache.set(key, fresh);
          if (onFreshData) onFreshData(fresh);
        })
        .catch(() => {});
      return cached;
    }

    const fresh = await fetcher();
    queryCache.set(key, fresh);
    return fresh;
  },
};
