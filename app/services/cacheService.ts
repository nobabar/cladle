/**
 * Cache Service - IndexedDB Implementation
 *
 * Hybrid caching strategy for Cladle:
 * - HTTP cache: Handled automatically by browser (fetch API)
 * - IndexedDB: Stores processed animal/clade data and LCA results
 *
 * Features:
 * - TTL (Time To Live) based expiration
 * - Type-safe operations with TypeScript
 * - Support for offline capability
 * - Automatic cleanup of expired entries
 *
 * Store structure:
 * - animals: Animal data cache
 * - clades: Clade data cache
 * - lca: LCA calculation results cache
 */

import type { DBSchema, IDBPDatabase } from "idb";
import { openDB } from "idb";
import type { Animal } from "~/types/animal";
import type { Clade } from "~/types/clade";

/**
 * Database configuration
 */
const DB_NAME = "cladle-cache";
const DB_VERSION = 1;

/**
 * Default TTL values (in milliseconds)
 */
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
    value: CacheEntry<Animal>;
  };
  clades: {
    key: string;
    value: CacheEntry<Clade>;
  };
  lca: {
    key: string;
    value: CacheEntry<LCAResult>;
  };
}

/**
 * Type alias for cache store names
 */
export type CacheStore = "animals" | "clades" | "lca";

/**
 * CacheService Class
 *
 * Provides IndexedDB-based caching with TTL support.
 * Handles cache initialization, CRUD operations, and expiration management.
 */
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
    // Skip if already initialized
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
      // Graceful degradation: Cache will be unavailable but app can continue
      // Individual cache operations will return null when db is not initialized
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
      // Auto-initialize if not initialized
      if (!this.db) {
        await this.init();
      }

      // If still no db after init (e.g., IndexedDB disabled), return null
      if (!this.db) {
        return null;
      }

      const entry = await this.db.get(store, key);

      // Return null if entry doesn't exist
      if (!entry) {
        return null;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        // Clean up expired entry
        await this.db.delete(store, key);
        return null;
      }

      // Return cached data
      return entry.data as T;
    } catch (error: any) {
      console.error(`Cache get failed for ${store}:${key}:`, error);
      return null; // Graceful degradation: return null on error
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
      // Auto-initialize if not initialized
      if (!this.db) {
        await this.init();
      }

      // If still no db after init, silently fail (graceful degradation)
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
      // Handle quota exceeded error
      if (error.name === "QuotaExceededError") {
        console.error(`Cache quota exceeded for ${store}:${key}. Consider clearing old entries.`);
        // Attempt to clear expired entries to free up space
        try {
          await this.clearExpired();
        } catch (clearError) {
          console.error("Failed to clear expired entries:", clearError);
        }
      } else {
        console.error(`Cache set failed for ${store}:${key}:`, error);
      }
      // Graceful degradation: don't throw, just log
    }
  }

  /**
   * Check if key exists and is not expired
   *
   * @param store - Store name (animals, clades, or lca)
   * @param key - Cache key to check
   * @returns Promise resolving to true if key exists and is valid
   */
  async has(store: CacheStore, key: string): Promise<boolean> {
    const data = await this.get(store, key);
    return data !== null;
  }

  /**
   * Clear all data from a store
   *
   * @param store - Store name to clear
   * @returns Promise that resolves when store is cleared
   */
  async clear(store: CacheStore): Promise<void> {
    try {
      // Auto-initialize if not initialized
      if (!this.db) {
        await this.init();
      }

      if (!this.db) {
        return; // Graceful degradation
      }

      await this.db.clear(store);
    } catch (error: any) {
      console.error(`Cache clear failed for ${store}:`, error);
      // Don't throw, allow graceful degradation
    }
  }

  /**
   * Clear expired entries from a single store
   * Helper method to reduce nesting complexity
   *
   * @param store - Store to clean
   * @param now - Current timestamp
   * @private
   */
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

  /**
   * Clear expired entries from all stores
   * Useful for periodic cleanup to free up storage
   *
   * @returns Promise that resolves when cleanup is complete
   */
  async clearExpired(): Promise<void> {
    try {
      // Auto-initialize if not initialized
      if (!this.db) {
        await this.init();
      }

      if (!this.db) {
        return; // Graceful degradation
      }

      const stores: CacheStore[] = ["animals", "clades", "lca"];
      const now = Date.now();

      for (const store of stores) {
        try {
          await this.clearExpiredFromStore(store, now);
        } catch (storeError: any) {
          console.error(`Failed to clear expired entries from ${store}:`, storeError);
          // Continue with other stores
        }
      }
    } catch (error: any) {
      console.error("Cache clearExpired failed:", error);
      // Don't throw, allow graceful degradation
    }
  }

  /**
   * Close database connection
   * Useful for cleanup when cache is no longer needed
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Create a new CacheService instance
 * Factory function for dependency injection and testing
 *
 * @returns New CacheService instance
 */
export function createCacheService(): CacheService {
  return new CacheService();
}

/**
 * Default singleton instance
 * Pre-initialized cache service for application-wide use
 */
export const cacheService = createCacheService();

/**
 * Utility functions for generating consistent cache keys
 */
export const CacheKeys = {
  /**
   * Generate cache key for animal data
   * @param animalId - Unique animal identifier
   * @returns Cache key in format "animal:{id}"
   */
  animal: (animalId: string): string => `animal:${animalId}`,

  /**
   * Generate cache key for clade data
   * @param cladeName - Clade name
   * @returns Cache key in format "clade:{name}"
   */
  clade: (cladeName: string): string => `clade:${cladeName}`,

  /**
   * Generate cache key for LCA result
   * IDs are sorted to ensure consistent key regardless of input order
   *
   * @param animalId1 - First animal ID
   * @param animalId2 - Second animal ID
   * @returns Cache key in format "lca:{id1}:{id2}" (sorted)
   */
  lca: (animalId1: string, animalId2: string): string => {
    const [id1, id2] = [animalId1, animalId2].sort();
    return `lca:${id1}:${id2}`;
  },
};
