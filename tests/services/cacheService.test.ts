/**
 * Cache Service Tests
 *
 * Tests for IndexedDB-based cache service with TTL support.
 * Uses fake-indexeddb for testing browser IndexedDB API.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { CacheService } from "~/services/cacheService";

describe("cacheService", () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    cacheService = new CacheService();
    await cacheService.init();
  });

  afterEach(async () => {
    // Clean up all stores
    await cacheService.clear("animals");
    await cacheService.clear("clades");
    await cacheService.clear("lca");
    // Close database connection to prevent resource leaks
    cacheService.close();
  });

  describe("initialization", () => {
    it("should initialize without errors", async () => {
      const service = new CacheService();
      await expect(service.init()).resolves.toBeUndefined();
    });

    it("should create all required stores", async () => {
      // Store creation is verified by being able to use them
      await expect(
        cacheService.set("animals", "test", { id: "1" }),
      ).resolves.toBeUndefined();
      await expect(
        cacheService.set("clades", "test", { name: "Mammalia" }),
      ).resolves.toBeUndefined();
      await expect(
        cacheService.set("lca", "test", { result: "test" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("basic operations", () => {
    it("should store and retrieve data", async () => {
      const testData = { id: "1", name: "Tiger", scientificName: "Panthera tigris" };

      await cacheService.set("animals", "animal:1", testData);
      const result = await cacheService.get("animals", "animal:1");

      expect(result).toEqual(testData);
    });

    it("should return null for non-existent keys", async () => {
      const result = await cacheService.get("animals", "animal:999");
      expect(result).toBeNull();
    });

    it("should handle multiple entries in same store", async () => {
      const data1 = { id: "1", name: "Tiger" };
      const data2 = { id: "2", name: "Lion" };

      await cacheService.set("animals", "animal:1", data1);
      await cacheService.set("animals", "animal:2", data2);

      expect(await cacheService.get("animals", "animal:1")).toEqual(data1);
      expect(await cacheService.get("animals", "animal:2")).toEqual(data2);
    });

    it("should overwrite existing data with same key", async () => {
      const original = { id: "1", name: "Tiger" };
      const updated = { id: "1", name: "Bengal Tiger" };

      await cacheService.set("animals", "animal:1", original);
      await cacheService.set("animals", "animal:1", updated);

      const result = await cacheService.get("animals", "animal:1");
      expect(result).toEqual(updated);
    });
  });

  describe("tTL expiration", () => {
    it("should return null for expired entries", async () => {
      const testData = { id: "1", name: "Tiger" };

      // Set with 1ms TTL
      await cacheService.set("animals", "animal:1", testData, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = await cacheService.get("animals", "animal:1");

      expect(result).toBeNull();
    });

    it("should return data before expiration", async () => {
      const testData = { id: "1", name: "Tiger" };

      // Set with 1 second TTL
      await cacheService.set("animals", "animal:1", testData, 1000);

      // Retrieve immediately (should work)
      const result = await cacheService.get("animals", "animal:1");

      expect(result).toEqual(testData);
    });

    it("should use default TTL when not specified", async () => {
      const testData = { id: "1", name: "Tiger" };

      // Set without TTL (should use default 24 hours)
      await cacheService.set("animals", "animal:1", testData);

      // Should be available immediately
      const result = await cacheService.get("animals", "animal:1");

      expect(result).toEqual(testData);
    });

    it("should clean up expired entries on get", async () => {
      const testData = { id: "1", name: "Tiger" };

      // Set with 1ms TTL
      await cacheService.set("animals", "animal:1", testData, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));

      // Get should return null and clean up
      await cacheService.get("animals", "animal:1");

      // Second get should still return null (entry deleted)
      const result = await cacheService.get("animals", "animal:1");
      expect(result).toBeNull();
    });
  });

  describe("has method", () => {
    it("should return true for existing non-expired keys", async () => {
      const testData = { id: "1", name: "Tiger" };

      await cacheService.set("animals", "animal:1", testData);

      expect(await cacheService.has("animals", "animal:1")).toBe(true);
    });

    it("should return false for non-existent keys", async () => {
      expect(await cacheService.has("animals", "animal:999")).toBe(false);
    });

    it("should return false for expired keys", async () => {
      const testData = { id: "1", name: "Tiger" };

      // Set with 1ms TTL
      await cacheService.set("animals", "animal:1", testData, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(await cacheService.has("animals", "animal:1")).toBe(false);
    });
  });

  describe("clear method", () => {
    it("should clear all entries from a store", async () => {
      await cacheService.set("animals", "animal:1", { id: "1" });
      await cacheService.set("animals", "animal:2", { id: "2" });
      await cacheService.set("animals", "animal:3", { id: "3" });

      await cacheService.clear("animals");

      expect(await cacheService.has("animals", "animal:1")).toBe(false);
      expect(await cacheService.has("animals", "animal:2")).toBe(false);
      expect(await cacheService.has("animals", "animal:3")).toBe(false);
    });

    it("should only clear specified store", async () => {
      await cacheService.set("animals", "animal:1", { id: "1" });
      await cacheService.set("clades", "clade:1", { name: "Mammalia" });

      await cacheService.clear("animals");

      expect(await cacheService.has("animals", "animal:1")).toBe(false);
      expect(await cacheService.has("clades", "clade:1")).toBe(true);
    });

    it("should handle clearing empty store", async () => {
      await expect(cacheService.clear("animals")).resolves.toBeUndefined();
    });
  });

  describe("clearExpired method", () => {
    it("should remove expired entries from all stores", async () => {
      // Add mix of expired and valid entries
      await cacheService.set("animals", "animal:1", { id: "1" }, 1); // Will expire
      await cacheService.set("animals", "animal:2", { id: "2" }, 10000); // Valid
      await cacheService.set("clades", "clade:1", { name: "Mammalia" }, 1); // Will expire

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));

      await cacheService.clearExpired();

      // Expired entries should be gone
      expect(await cacheService.get("animals", "animal:1")).toBeNull();
      expect(await cacheService.get("clades", "clade:1")).toBeNull();

      // Valid entry should remain
      expect(await cacheService.get("animals", "animal:2")).toEqual({ id: "2" });
    });

    it("should handle clearing when no expired entries exist", async () => {
      await cacheService.set("animals", "animal:1", { id: "1" }, 10000);

      await expect(cacheService.clearExpired()).resolves.toBeUndefined();

      // Entry should still exist
      expect(await cacheService.get("animals", "animal:1")).toEqual({ id: "1" });
    });
  });

  describe("cache key strategies", () => {
    it("should handle animal cache keys", async () => {
      const animal = { id: "123", name: "Tiger" };
      const cacheKey = `animal:${animal.id}`;

      await cacheService.set("animals", cacheKey, animal);

      expect(await cacheService.get("animals", cacheKey)).toEqual(animal);
    });

    it("should handle clade cache keys", async () => {
      const clade = { name: "Mammalia", rank: "class" };
      const cacheKey = `clade:${clade.name}`;

      await cacheService.set("clades", cacheKey, clade);

      expect(await cacheService.get("clades", cacheKey)).toEqual(clade);
    });

    it("should handle LCA cache keys with sorted IDs", async () => {
      const lcaResult = { lca: "Felidae", distance: 2 };

      // Sort IDs to ensure consistent keys regardless of order
      const ids = ["456", "123"].sort();
      const cacheKey = `lca:${ids.join(":")}`;

      await cacheService.set("lca", cacheKey, lcaResult);

      expect(await cacheService.get("lca", cacheKey)).toEqual(lcaResult);

      // Same IDs in different order should use same key
      const reversedKey = `lca:${["123", "456"].sort().join(":")}`;
      expect(await cacheService.get("lca", reversedKey)).toEqual(lcaResult);
    });
  });

  describe("data type handling", () => {
    it("should handle complex nested objects", async () => {
      const complexData = {
        id: "1",
        name: "Tiger",
        taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae"],
        metadata: {
          imageUrl: "https://example.com/tiger.jpg",
          wikipediaUrl: "https://en.wikipedia.org/wiki/Tiger",
          description: "Large cat species",
        },
      };

      await cacheService.set("animals", "animal:1", complexData);
      const result = await cacheService.get("animals", "animal:1");

      expect(result).toEqual(complexData);
    });

    it("should handle arrays", async () => {
      const arrayData = ["Animalia", "Chordata", "Mammalia"];

      await cacheService.set("animals", "taxonomy:1", arrayData);
      const result = await cacheService.get("animals", "taxonomy:1");

      expect(result).toEqual(arrayData);
    });

    it("should handle null values in data", async () => {
      const dataWithNull = { id: "1", name: "Tiger", imageUrl: null };

      await cacheService.set("animals", "animal:1", dataWithNull);
      const result = await cacheService.get("animals", "animal:1");

      expect(result).toEqual(dataWithNull);
    });
  });

  describe("error handling", () => {
    it("should handle init being called multiple times", async () => {
      const service = new CacheService();
      await service.init();
      await expect(service.init()).resolves.toBeUndefined();
    });

    it("should auto-initialize if get called before init", async () => {
      const service = new CacheService();
      // Don't call init explicitly

      await service.set("animals", "animal:1", { id: "1" });
      const result = await service.get("animals", "animal:1");

      expect(result).toEqual({ id: "1" });
    });
  });
});
