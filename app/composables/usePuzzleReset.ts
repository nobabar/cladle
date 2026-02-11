/**
 * Composable for monitoring daily puzzle date and triggering reset at midnight (UTC).
 *
 * Uses lazy reset: checks on an interval and when the page becomes visible,
 * then calls the provided onReset callback so the app can load the new daily puzzle.
 * Avoids heavy polling; reset runs on next interaction or when user returns to the tab.
 */

import { onMounted, onUnmounted } from "vue";
import { useGameStore } from "~/stores/gameStore";

/** Default poll interval for date change check (ms) */
const DEFAULT_POLL_INTERVAL_MS = 60_000;

export interface UsePuzzleResetOptions {
  /** Callback when midnight has passed and puzzle should reset (e.g. load new daily puzzle) */
  onReset: () => void;
  /** Poll interval in ms; default 60000 (1 minute) */
  pollIntervalMs?: number;
}

/**
 * Monitor for midnight (UTC) and trigger reset when the daily puzzle date has changed.
 * Call onReset when gameStore.shouldResetForNewDay() becomes true (lazy reset on next check).
 * @param options - Options for the puzzle reset
 * @param options.onReset - Callback when midnight has passed and puzzle should reset (e.g. load new daily puzzle)
 * @param options.pollIntervalMs - Poll interval in ms; default 60000 (1 minute)
 */
export function usePuzzleReset(options: UsePuzzleResetOptions): void {
  const { onReset, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } = options;
  const gameStore = useGameStore();

  function checkAndReset(): void {
    if (!gameStore.shouldResetForNewDay()) {
      return;
    }
    gameStore.resetForNewDay();
    onReset();
  }

  onMounted(() => {
    const intervalId = setInterval(checkAndReset, pollIntervalMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndReset();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    onUnmounted(() => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    });
  });
}
