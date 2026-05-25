import { onMounted, watch } from "vue";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";
import { useGameStore } from "~/stores/gameStore";

/**
 * Keeps the mystery/target animal name and description aligned with the active UI locale.
 * Refetches from the API (locale-aware cache) when locale changes or a target is restored.
 */
export function useSyncTargetWithLocale(): void {
  const gameStore = useGameStore();
  const api = useBiologicalAPI();
  const { locale } = useI18n();

  let syncGeneration = 0;

  async function syncTargetLocale(): Promise<void> {
    const targetId = gameStore.target?.id;
    if (!targetId) {
      return;
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
}
