import { computed } from "vue";

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Francais" },
] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number]["code"];

export function useUserPreferences() {
  const colorMode = useColorMode();
  const { locale, setLocale } = useI18n();

  const isDarkMode = computed(() => colorMode.value === "dark");

  function toggleColorMode() {
    colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
  }

  async function updateLocale(nextLocale: SupportedLocale) {
    await setLocale(nextLocale);
  }

  return {
    locale,
    isDarkMode,
    toggleColorMode,
    updateLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
}
