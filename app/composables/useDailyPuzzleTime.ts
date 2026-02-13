/**
 * Single composable for all daily puzzle time logic: midnight reset and countdown to next puzzle.
 *
 * - Runs reset check on an interval and on tab visibility; calls onReset when midnight UTC has passed.
 * - Exposes nextPuzzleIn and isSoon for the countdown UI, with two-tier scheduling:
 *   when next puzzle is not "soon" (>1h), ticks every 60s (or at soon boundary); when soon, every 1s.
 * - SSR-safe: countdown state is set only after mount.
 */

import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  formatTimeUntilNextPuzzle,
  getSecondsUntilNextPuzzle,
} from "~/utils/dateUtils";
import { useGameStore } from "~/stores/gameStore";

/** Poll interval for midnight reset check (ms). Also used for countdown when not "soon". */
const DAILY_PUZZLE_POLL_INTERVAL_MS = 60_000;

/** Show "Next puzzle in" timer only when next puzzle is within this many seconds (1 hour). */
const NEXT_PUZZLE_SOON_THRESHOLD_SECONDS = 3600;

/** Countdown display update interval when in "soon" window (ms). */
const COUNTDOWN_UPDATE_INTERVAL_MS = 1000;

interface UseDailyPuzzleTimeOptions {
  /** Callback when midnight has passed and puzzle should reset (e.g. load new daily puzzle) */
  onReset: () => void;
  /** Override poll interval for reset check (ms). Default from constants. */
  pollIntervalMs?: number;
}

/**
 * Daily puzzle time: reset on midnight UTC + countdown until next puzzle.
 * @param options - Options for the composable
 * @param options.onReset - Callback when midnight has passed and puzzle should reset (e.g. load new daily puzzle)
 * @param options.pollIntervalMs - Override poll interval for reset check (ms). Default from constants.
 * @returns nextPuzzleIn (formatted string), isSoon (true when <= 1h to next puzzle)
 */
export function useDailyPuzzleTime(options: UseDailyPuzzleTimeOptions) {
  const { onReset, pollIntervalMs = DAILY_PUZZLE_POLL_INTERVAL_MS } = options;
  const gameStore = useGameStore();

  // SSR-safe: set only in onMounted so no server-time on first paint
  const nextPuzzleIn = ref("");
  const secondsUntilNext = ref(Number.POSITIVE_INFINITY);

  const isSoon = computed(
    () => secondsUntilNext.value <= NEXT_PUZZLE_SOON_THRESHOLD_SECONDS,
  );

  function checkAndReset(): void {
    if (!gameStore.shouldResetForNewDay()) {
      return;
    }
    gameStore.resetForNewDay();
    onReset();
  }

  let countdownTimeoutId: ReturnType<typeof setTimeout> | null = null;

  function tick(): void {
    const now = new Date();
    const secs = getSecondsUntilNextPuzzle(now);
    secondsUntilNext.value = secs;
    nextPuzzleIn.value = formatTimeUntilNextPuzzle(now);

    if (countdownTimeoutId !== null) {
      clearTimeout(countdownTimeoutId);
      countdownTimeoutId = null;
    }

    if (secs <= NEXT_PUZZLE_SOON_THRESHOLD_SECONDS) {
      countdownTimeoutId = setTimeout(tick, COUNTDOWN_UPDATE_INTERVAL_MS);
    } else {
      const msUntilSoon = (secs - NEXT_PUZZLE_SOON_THRESHOLD_SECONDS) * 1000;
      const delayMs = Math.min(DAILY_PUZZLE_POLL_INTERVAL_MS, msUntilSoon);
      countdownTimeoutId = setTimeout(tick, delayMs);
    }
  }

  onMounted(() => {
    tick();

    const resetIntervalId = setInterval(checkAndReset, pollIntervalMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndReset();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    onUnmounted(() => {
      clearInterval(resetIntervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (countdownTimeoutId !== null) {
        clearTimeout(countdownTimeoutId);
        countdownTimeoutId = null;
      }
    });
  });

  return { nextPuzzleIn, isSoon };
}
