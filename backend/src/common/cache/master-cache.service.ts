import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  maxCapacity: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

@Injectable()
export class MasterCacheService {
  private readonly logger = new Logger(MasterCacheService.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs = 5 * 60 * 1000; // 5 minutes
  private readonly maxCapacity = 2000;

  private hits = 0;
  private misses = 0;
  private evictions = 0;

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh position for true Least Recently Used (LRU) semantics
    this.store.delete(key);
    this.store.set(key, entry);

    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxCapacity) {
      // Evict oldest entry (LRU)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.evictions++;
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidates all cached master bundles and rate lookups for a specific tenant owner.
   */
  invalidateTenant(ownerId: string): void {
    if (!ownerId) return;

    let clearedCount = 0;
    for (const key of this.store.keys()) {
      if (key.includes(ownerId)) {
        this.store.delete(key);
        clearedCount++;
      }
    }
    if (clearedCount > 0) {
      this.logger.debug(`Invalidated ${clearedCount} cache entries for tenant "${ownerId}"`);
    }
  }

  /**
   * Invalidates any rate matrix cache associated with a site, vehicle type, or material type.
   */
  invalidateRate(siteId?: string, vehicleTypeId?: string, materialTypeId?: string): void {
    for (const [key] of this.store.entries()) {
      if (
        (siteId && key.includes(siteId)) ||
        (vehicleTypeId && key.includes(vehicleTypeId)) ||
        (materialTypeId && key.includes(materialTypeId))
      ) {
        this.store.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      size: this.store.size,
      maxCapacity: this.maxCapacity,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: totalRequests > 0 ? Math.round((this.hits / totalRequests) * 1000) / 10 : 0,
    };
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
}
