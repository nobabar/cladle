import { vi } from "vitest";
import en from "~/locales/en.json";

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
