import { computed, watch } from "vue";

export type ReadableFontPreference = "on" | "off";

const COOKIE_NAME = "readable-font";

const cookieOptions = {
  default: () => "off",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

/** One client-side watch: keeps `<html class="font-readable">` in sync with the cookie. */
let domClassSyncStarted = false;

function startDomClassSync(preference: ReturnType<typeof useCookie<string>>) {
  if (!import.meta.client || domClassSyncStarted) {
    return;
  }
  domClassSyncStarted = true;
  watch(
    preference,
    () => {
      document.documentElement.classList.toggle(
        "font-readable",
        preference.value === "on",
      );
    },
    { immediate: true },
  );
}

/**
 * Reading-comfort font preference (cookie `readable-font`: `"on"` | `"off"`).
 * Call from the app root so the document class stays in sync; safe to call again from modals (same cookie ref).
 * @returns Readable font preference and setter
 */
export function useReadableFont() {
  const preference = useCookie<string>(COOKIE_NAME, cookieOptions);

  startDomClassSync(preference);

  const readableFontPreference = computed<ReadableFontPreference>(() =>
    preference.value === "on" ? "on" : "off",
  );

  function setReadableFontPreference(next: ReadableFontPreference) {
    preference.value = next;
  }

  return {
    readableFontPreference,
    setReadableFontPreference,
  };
}
