/**
 * Cache Cleanup Plugin
 *
 * Performs cleanup of expired cache entries
 * Runs on app initialization (client-side only)
 */

import { cacheService } from "~/services/cacheService";

export default defineNuxtPlugin(() => {
  // Clear expired entries on app startup
  cacheService.clearExpired().catch((error) => {
    console.error("Failed to clear expired cache entries on startup:", error);
  });
});
