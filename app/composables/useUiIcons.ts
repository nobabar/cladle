import { computed } from "vue";
import { useReadableFont } from "~/composables/useReadableFont";
import { uiIconHandDrawn, uiIconLucide } from "~/utils/uiIcons";

/**
 * Icon names that follow the reading-comfort setting: Lucide when Lexend is on, hand-drawn otherwise.
 * @returns Computed ref to the active icon map (same keys as {@link uiIconHandDrawn}).
 */
export function useUiIcons() {
  const { readableFontPreference } = useReadableFont();

  return computed(() =>
    readableFontPreference.value === "on" ? uiIconLucide : uiIconHandDrawn,
  );
}
