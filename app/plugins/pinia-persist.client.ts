/**
 * Cladle Pinia persistence (client-only).
 *
 * `pinia-plugin-persistedstate/nuxt` registers the Pinia plugin. This file is the
 * explicit Cladle hook point for future storage hardening and documents the stack:
 * default storage is `localStorage` via `runtimeConfig.public.piniaPluginPersistedstate`
 * in `nuxt.config.ts`; the game store uses `~/utils/piniaGameStorePersistence` for versioned JSON.
 */
export default defineNuxtPlugin({
  name: "cladle-pinia-persist",
  setup() {
    // Intentionally empty — persistence is active through the Nuxt module + store options.
  },
});
