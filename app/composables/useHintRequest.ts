import { computed, ref } from "vue";
import { useGameStore } from "~/stores/gameStore";
import { HINT_GUESS_COST } from "~/types/hint";

/**
 * Shared hint state for daily and free-play game pages.
 * @returns Hint UI state, disabled reasons, and confirm handler for `GameHintControl`.
 */
export function useHintRequest() {
  const gameStore = useGameStore();
  const { t } = useI18n();

  const hintAnnouncement = ref("");

  const hintDisabledReasonKey = computed(() => {
    if (gameStore.isReplayMode) {
      return "game.hint.disabled.replay";
    }
    if (!gameStore.isPlaying) {
      return "game.hint.disabled.gameEnded";
    }
    if (gameStore.guessesRemaining <= HINT_GUESS_COST) {
      return "game.hint.disabled.insufficientGuesses";
    }
    if (!gameStore.hasHintAvailable) {
      return "game.hint.disabled.unavailable";
    }
    return undefined;
  });

  const isHintControlDisabled = computed(
    () =>
      !gameStore.isPlaying
      || gameStore.isReplayMode
      || !gameStore.canRequestHint,
  );

  function handleHintConfirm() {
    if (!gameStore.canRequestHint) {
      return;
    }
    gameStore.requestHint();
    const clade = gameStore.hints.at(-1)?.revealedClade;
    if (clade) {
      hintAnnouncement.value = t("game.hint.success", { clade });
    }
  }

  return {
    hintAnnouncement,
    hintDisabledReasonKey,
    isHintControlDisabled,
    handleHintConfirm,
    HINT_GUESS_COST,
  };
}
