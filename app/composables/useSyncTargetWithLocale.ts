import { onMounted, watch } from "vue";
import { useBiologicalAPI } from "~/composables/useBiologicalAPI";
import { useGameStore } from "~/stores/gameStore";
import type { Animal } from "~/types/animal";

function isEnglishLocale(locale: string): boolean {
  return locale === "en" || locale.startsWith("en-");
}

function hasNonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Baby Mode offline bundle already ships English reveal media.
 * @param target - Current mystery animal
 * @returns True when English UI can rely on the offline bundle alone
 */
function babyBundleCompleteForEnglish(target: Animal): boolean {
  return hasNonEmpty(target.imageUrl)
    && hasNonEmpty(target.description)
    && hasNonEmpty(target.wikipediaUrl);
}

/**
 * Keeps the mystery/target animal name and description aligned with the active UI locale.
 * Refetches from the API (locale-aware cache) when locale changes or the target taxon changes.
 * Baby Mode skips the network when the English UI can use a complete offline bundle payload.
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

    const englishUi = isEnglishLocale(locale.value);
    if (
      gameStore.gameMode === "baby"
      && englishUi
      && babyBundleCompleteForEnglish(target)
    ) {
      return;
    }

    // Avoid flashing English Wikipedia copy while waiting for a localized fetch.
    if (gameStore.gameMode === "baby" && !englishUi && hasNonEmpty(target.description)) {
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
    () => gameStore.target?.id,
    (targetId) => {
      if (targetId) {
        void syncTargetLocale();
      }
    },
  );
}
