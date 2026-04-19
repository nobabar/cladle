import { ref } from "vue";
import { vi } from "vitest";
import en from "~/locales/en.json";

/**
 * Nuxt provides `useCookie` etc.; Vitest does not. Stub reading-font preference so
 * `useUiIcons` (explicitly imported in SFCs) runs without Nuxt.
 */
vi.mock("~/composables/useReadableFont", () => ({
  useReadableFont: () => ({
    readableFontPreference: ref<"on" | "off">("off"),
    setReadableFontPreference: vi.fn(),
  }),
}));

// JSDOM has no Canvas 2D implementation; `treeNodeWidth` uses measureText. Without this,
// every getContext("2d") logs: "Not implemented: HTMLCanvasElement's getContext()..."
if (typeof HTMLCanvasElement !== "undefined") {
  function mockGetContext(this: HTMLCanvasElement, type: string): CanvasRenderingContext2D | null {
    if (type !== "2d") {
      return null;
    }
    let font = "14px sans-serif";
    return {
      get font() {
        return font;
      },
      set font(value: string) {
        font = value;
      },
      measureText(text: string) {
        const sizeMatch = /(\d+(?:\.\d+)?)px/.exec(font);
        const fontSize = sizeMatch ? Number(sizeMatch[1]) : 14;
        const avgCharWidth = fontSize * 0.6;
        return { width: (text ?? "").length * avgCharWidth };
      },
    } as unknown as CanvasRenderingContext2D;
  }
  HTMLCanvasElement.prototype.getContext = mockGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

interface TranslateParams {
  [key: string]: string | number;
}
interface MessageTree {
  [key: string]: string | MessageTree;
}

function interpolate(template: string, params: TranslateParams = {}) {
  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? ""));
}

function getMessageByKey(tree: MessageTree, key: string): string | undefined {
  const value = key.split(".").reduce<string | MessageTree | undefined>((acc, segment) => {
    if (!acc || typeof acc === "string") return undefined;
    return acc[segment];
  }, tree);
  return typeof value === "string" ? value : undefined;
}

const localeRef = { value: "en" };

const i18nMock = {
  locale: localeRef,
  t: (key: string, params?: TranslateParams) =>
    interpolate(getMessageByKey(en as MessageTree, key) ?? key, params),
  setLocale: vi.fn(async (nextLocale: string) => {
    localeRef.value = nextLocale;
  }),
};

(globalThis as any).useI18n = () => i18nMock;
