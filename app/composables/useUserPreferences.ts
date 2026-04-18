import { computed } from "vue";

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Francais" },
] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number]["code"];

export const COLOR_MODE_PREFERENCES = ["system", "light", "dark"] as const;
export type ColorModeUserPreference = typeof COLOR_MODE_PREFERENCES[number];

export function useUserPreferences() {
  const colorMode = useColorMode();
  const { locale, setLocale } = useI18n();

  const isDarkMode = computed(() => colorMode.value === "dark");

  const colorModePreference = computed((): ColorModeUserPreference => {
    const p = colorMode.preference;
    if (p === "system" || p === "light" || p === "dark") {
      return p;
    }
    return "system";
  });

  function setColorModePreference(next: ColorModeUserPreference) {
    colorMode.preference = next;
  }

  async function updateLocale(nextLocale: SupportedLocale) {
    await setLocale(nextLocale);
  }

  return {
    locale,
    isDarkMode,
    colorModePreference,
    setColorModePreference,
    updateLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
}
