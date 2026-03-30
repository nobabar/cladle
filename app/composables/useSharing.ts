import { computed, ref } from "vue";
import { useGameStore } from "~/stores/gameStore";
import { buildShareableText } from "~/utils/sharingFormatter";
import type { ShareableGameSnapshot } from "~/utils/sharingFormatter";
import { getUserFriendlyError } from "~/utils/errorMessages";

type CopyStatus = "idle" | "success" | "error";

/**
 * Copy-to-clipboard sharing composable.
 *
 * @returns Object exposing `copyShareText`, `shareableText`, `isShareReady`,
 * `lastCopyStatus`, and `copyError`.
 */
export function useSharing() {
  const gameStore = useGameStore();

  const shareableText = computed((): string | null => {
    if (!gameStore.hasEnded) {
      return null;
    }

    const gameMode = gameStore.gameMode ?? "free-play";
    const snapshot: ShareableGameSnapshot = {
      status: gameStore.status,
      target: gameStore.target,
      guesses: gameStore.guesses,
      treeData: gameStore.treeData,
      gameMode,
      puzzleDate: gameStore.puzzleDate,
      maxGuesses: gameStore.maxGuesses,
    };

    return buildShareableText(snapshot);
  });

  const isShareReady = computed(() => shareableText.value != null);

  const lastCopyStatus = ref<CopyStatus>("idle");
  const copyError = ref<string | null>(null);

  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  function clearResetTimer() {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  }

  function setTransientStatus(nextStatus: CopyStatus) {
    clearResetTimer();
    lastCopyStatus.value = nextStatus;
    resetTimer = setTimeout(() => {
      lastCopyStatus.value = "idle";
      resetTimer = null;
    }, 2000);
  }

  /**
   * Copies the full share body to clipboard.
   */
  async function copyShareText(): Promise<void> {
    const text = shareableText.value;
    if (!text) {
      return;
    }

    const writeText
      = typeof navigator !== "undefined"
        ? navigator.clipboard?.writeText?.bind(navigator.clipboard) ?? null
        : null;

    if (!writeText) {
      const message = getUserFriendlyError("SHARE_CLIPBOARD_FAILED");
      gameStore.setError({
        message,
        code: "SHARE_CLIPBOARD_FAILED",
        type: "ui",
      });
      copyError.value = message;
      setTransientStatus("error");
      return;
    }

    try {
      await writeText(text);
      copyError.value = null;
      setTransientStatus("success");
    } catch {
      const message = getUserFriendlyError("SHARE_CLIPBOARD_FAILED");
      gameStore.setError({
        message,
        code: "SHARE_CLIPBOARD_FAILED",
        type: "ui",
      });
      copyError.value = message;
      setTransientStatus("error");
    }
  }

  return {
    copyShareText,
    shareableText,
    isShareReady,
    lastCopyStatus,
    copyError,
  };
}
