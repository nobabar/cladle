/**
 * IndexedDB cache for processed animals, clades, and LCA results (TTL per entry).
 * Fetch responses may still use the browser HTTP cache; this layer is for structured app data and offline reuse.
 */

import type { DBSchema, IDBPDatabase } from "idb";
import { openDB } from "idb";
import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";

/**
 * IndexedDB value for animals/clades: either a legacy single record or a locale bundle
 * so one cache key (taxon id) can hold multiple API locale variants.
 */
export interface LocaleKeyedBundle<T> {
  locales: Partial<Record<string, T>>;
};

const DB_NAME = "cladle-cache";
const DB_VERSION = 1;

const DEFAULT_TTL = 86400000; // 24 hours
export const TTL_VALUES = {
  ANIMAL: 86400000, // 24 hours
  CLADE: 86400000, // 24 hours
  LCA: 604800000, // 7 days
};

/**
 * LCA (Last Common Ancestor) Result Interface
 * Represents the result of an LCA calculation between two animals
 */
export interface LCAResult {
  /** Name of the last common ancestor clade */
  lca: string;
  /** Taxonomic distance/depth to the LCA */
  distance?: number;
  /** Additional metadata about the LCA calculation */
  metadata?: Record<string, unknown>;
}

/**
 * Cache Entry Structure
 * Wraps cached data with metadata for expiration management
 */
export interface CacheEntry<T> {
  /** Cache key identifier */
  key: string;
  /** Actual cached data */
  data: T;
  /** Timestamp when entry was cached (milliseconds since epoch) */
  timestamp: number;
  /** Time to live (milliseconds) */
  ttl: number;
  /** Expiration timestamp (timestamp + ttl) */
  expiresAt: number;
}

/**
 * Database Schema Definition
 * Defines the structure of IndexedDB stores
 */
interface CladleCacheDB extends DBSchema {
  animals: {
    key: string;
    value: CacheEntry<Animal | LocaleKeyedBundle<Animal>>;
  };
  clades: {
    key: string;
    value: CacheEntry<Clade | LocaleKeyedBundle<Clade>>;
  };
  lca: {
    key: string;
    value: CacheEntry<LCAResult>;
  };
}

export type CacheStore = "animals" | "clades" | "lca";

/** IndexedDB wrapper; `get` drops expired rows on read. */
export class CacheService {
  private db: IDBPDatabase<CladleCacheDB> | null = null;

  /**
   * Initialize IndexedDB connection
   * Creates database and object stores if they don't exist
   *
   * @returns Promise that resolves when initialization is complete
   * @throws Error if IndexedDB is not available or initialization fails
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    try {
      this.db = await openDB<CladleCacheDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create object stores if they don't exist
          if (!db.objectStoreNames.contains("animals")) {
            db.createObjectStore("animals");
          }
          if (!db.objectStoreNames.contains("clades")) {
            db.createObjectStore("clades");
          }
          if (!db.objectStoreNames.contains("lca")) {
            db.createObjectStore("lca");
          }
        },
      });
    } catch (error: any) {
      console.error("Failed to initialize IndexedDB cache:", error);
      this.db = null;
      throw new Error(`Cache initialization failed: ${error.message || String(error)}`);
    }
  }

  /**
   * Get cached data by key
   * Returns null if entry doesn't exist or has expired
   *
   * @param store - Store name (animals, clades, or lca)
   * @param key - Cache key
   * @returns Promise resolving to cached data or null
   */
  async get<T>(store: CacheStore, key: string): Promise<T | null> {
    try {
      if (!this.db) {
        await this.init();
      }

      if (!this.db) {
        return null;
      }

      const entry = await this.db.get(store, key);

      if (!entry) {
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        // Clean up expired entry
        await this.db.delete(store, key);
        return null;
      }

      // Return cached data
      return entry.data as T;
    } catch (error: any) {
      console.error(`Cache get failed for ${store}:${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with optional TTL
   *
   * @param store - Store name (animals, clades, or lca)
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (default: 24 hours)
   * @returns Promise that resolves when data is cached
   */
  async set<T>(
    store: CacheStore,
    key: string,
    data: T,
    ttl: number = DEFAULT_TTL,
  ): Promise<void> {
    try {
      if (!this.db) {
        await this.init();
      }

      if (!this.db) {
        console.warn(`Cache unavailable, cannot store ${store}:${key}`);
        return;
      }

      const now = Date.now();
      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: now,
        ttl,
        expiresAt: now + ttl,
      };

      await this.db.put(store, entry as any, key);
    } catch (error: any) {
      if (error.name === "QuotaExceededError") {
        console.error(`Cache quota exceeded for ${store}:${key}. Consider clearing old entries.`);
        // Clear expired entries to free up space
        try {
          await this.clearExpired();
        } catch (clearError) {
          console.error("Failed to clear expired entries:", clearError);
        }
      } else {
        console.error(`Cache set failed for ${store}:${key}:`, error);
      }
    }
  }

  async has(store: CacheStore, key: string): Promise<boolean> {
    const data = await this.get(store, key);
    return data !== null;
  }

  async clear(store: CacheStore): Promise<void> {
    try {
      if (!this.db) {
        await this.init();
      }

      if (!this.db) {
        return;
      }

      await this.db.clear(store);
    } catch (error: any) {
      console.error(`Cache clear failed for ${store}:`, error);
    }
  }

  private async clearExpiredFromStore(store: CacheStore, now: number): Promise<void> {
    if (!this.db) return;

    const allKeys = await this.db.getAllKeys(store);

    for (const key of allKeys) {
      const entry = await this.db.get(store, key);
      if (entry && now > entry.expiresAt) {
        await this.db.delete(store, key);
      }
    }
  }

  async clearExpired(): Promise<void> {
    try {
      if (!this.db) {
        await this.init();
      }

      if (!this.db) {
        return;
      }

      const stores: CacheStore[] = ["animals", "clades", "lca"];
      const now = Date.now();

      for (const store of stores) {
        try {
          await this.clearExpiredFromStore(store, now);
        } catch (storeError: any) {
          console.error(`Failed to clear expired entries from ${store}:`, storeError);
        }
      }
    } catch (error: any) {
      console.error("Cache clearExpired failed:", error);
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export function createCacheService(): CacheService {
  return new CacheService();
}

export const cacheService = createCacheService();

/**
 * Utility functions for generating consistent cache keys
 */
export const CacheKeys = {
  animal: (animalId: string): string => `animal:${animalId}`,
  cladeByTaxonId: (taxonId: string | number): string => `clade:taxon:${taxonId}`,
  clade: (cladeName: string): string => `clade:${cladeName}`,

  /**
   * Sorted IDs so A|B and B|A share one cache entry.
   * @param animalId1 - First animal ID
   * @param animalId2 - Second animal ID
   * @returns `lca:{id1}:{id2}` with ids ordered lexicographically
   */
  lca: (animalId1: string, animalId2: string): string => {
    const [id1, id2] = [animalId1, animalId2].sort();
    return `lca:${id1}:${id2}`;
  },
};
