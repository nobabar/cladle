import { getUserFriendlyError } from "~/utils/errorMessages";
import { setStorageFailureHandler } from "~/utils/storageSafe";

/**
 * Cladle Pinia persistence (client-only).
 *
 * `pinia-plugin-persistedstate/nuxt` registers the Pinia plugin. The game store uses
 * `createSafeLocalStorageForPinia()` (never throws on read/write). The first storage
 * failure per session surfaces a single non-technical `GameError` on the game store.
 */
export default defineNuxtPlugin({
  name: "cladle-pinia-persist",
  setup() {
    const store = useGameStore();
    setStorageFailureHandler((info) => {
      store.setError({
        message: getUserFriendlyError(info.code),
        code: info.code,
        type: "ui",
        details: { operation: info.operation, key: info.key },
      });
    });
  },
});
