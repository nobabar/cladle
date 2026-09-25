// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // SSG configuration - Static Site Generation for MVP
  ssr: false,

  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@nuxt/test-utils/module",
    "@nuxtjs/color-mode",
    "@nuxtjs/i18n",
  ],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  /**
   * Hand-drawn local icons (`app/assets/icons/cladle/*.svg`) -> `i-cladle-*`.
   * @see https://nuxt.com/modules/icon#custom-local-collections
   */
  icon: {
    customCollections: [
      {
        prefix: "cladle",
        dir: "./app/assets/icons/cladle",
      },
    ],
  },

  routeRules: {
    "/": { prerender: true },
    "/help": { prerender: true },
    "/privacy": { prerender: true },
  },

  compatibilityDate: "2025-01-15",

  vite: {
    optimizeDeps: {
      include: [
        "d3-hierarchy",
        "driver.js",
        "idb",
        "roughjs",
      ],
    },
  },

  typescript: {
    typeCheck: true,
    tsConfig: {
      compilerOptions: {
        paths: {
          "#test": ["../tests"],
          "#test/*": ["../tests/*"],
        },
      },
    },
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },

  colorMode: {
    preference: "system",
    fallback: "light",
    classSuffix: "",
  },

  /**
   * @see https://fonts.nuxt.com/get-started/providers
   * Manual `src` + files in `public/fonts/` keep fonts fully self-hosted (no Google or Fontsource CDN).
   */
  fonts: {
    provider: "local",
    families: [
      {
        name: "Atkinson Hyperlegible Next",
        global: true,
        weight: 300,
        style: "normal",
        display: "swap",
        src: "/fonts/atkinson-hyperlegible-next-latin-300-normal.woff2",
      },
      {
        name: "Atkinson Hyperlegible Next",
        global: true,
        weight: 400,
        style: "normal",
        display: "swap",
        src: "/fonts/atkinson-hyperlegible-next-latin-400-normal.woff2",
      },
      {
        name: "Atkinson Hyperlegible Next",
        global: true,
        weight: 500,
        style: "normal",
        display: "swap",
        src: "/fonts/atkinson-hyperlegible-next-latin-500-normal.woff2",
      },
      {
        name: "Atkinson Hyperlegible Next",
        global: true,
        weight: 600,
        style: "normal",
        display: "swap",
        src: "/fonts/atkinson-hyperlegible-next-latin-600-normal.woff2",
      },
      {
        name: "Atkinson Hyperlegible Next",
        global: true,
        weight: 700,
        style: "normal",
        display: "swap",
        src: "/fonts/atkinson-hyperlegible-next-latin-700-normal.woff2",
      },
    ],
  },

  i18n: {
    strategy: "no_prefix",
    defaultLocale: "en",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "cladle_locale",
      redirectOn: "root",
      alwaysRedirect: false,
      fallbackLocale: "en",
    },
    langDir: "../app/locales",
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "fr", name: "Francais", file: "fr.json" },
    ],
  },

  runtimeConfig: {
    githubToken: "",
    githubOwner: "nobabar",
    githubRepo: "cladle",
    public: {
      piniaPluginPersistedstate: {
        storage: "localStorage",
      },
    },
  },
});
