import { onMounted, watch } from "vue";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";
import { useGameStore } from "~/stores/gameStore";

function isEnglishLocale(locale: string): boolean {
  return locale === "en" || locale.startsWith("en-");
}

function hasNonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Keep target name/description aligned with the UI locale after won/lost.
 * Skips while the round is in progress (target not revealed yet).
 */
export function useSyncTargetWithLocale(): void {
  const gameStore = useGameStore();
  const api = useBiologicalAPI();
  const { locale } = useI18n();

  let syncGeneration = 0;

  async function syncTargetLocale(): Promise<void> {
    const target = gameStore.target;
    const targetId = target?.id;
    if (!targetId || !target) {
      return;
    }
    // Target id is not client-visible until won/lost.
    if (gameStore.status === "playing" || gameStore.status === "idle") {
      return;
    }

    if (
      gameStore.gameMode === "baby"
      && !isEnglishLocale(locale.value)
      && hasNonEmpty(target.description)
    ) {
      gameStore.clearTargetDescriptionForLocaleSync();
    }

    const generation = ++syncGeneration;
    const response = await api.fetchAnimalData(targetId);
    if (generation !== syncGeneration || !response.data) {
      return;
    }

    gameStore.applyLocalizedTarget(response.data);
  }

  onMounted(() => {
    void syncTargetLocale();
  });

  watch(
    () => locale.value,
    () => {
      void syncTargetLocale();
    },
  );

  watch(
    [() => gameStore.target?.id, () => gameStore.status],
    () => {
      if (gameStore.target?.id) {
        void syncTargetLocale();
      }
    },
  );
}
