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
   * Hand-drawn local icons (`app/assets/icons/cladle/*.svg`) → `i-cladle-*`.
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
  },

  compatibilityDate: "2025-01-15",

  typescript: {
    typeCheck: true,
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
        name: "Indie Flower",
        global: true,
        weight: 400,
        style: "normal",
        display: "swap",
        src: "/fonts/indie-flower-latin-400-normal.woff2",
        unicodeRange:
          "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
      },
      {
        name: "Indie Flower",
        global: true,
        weight: 400,
        style: "normal",
        display: "swap",
        src: "/fonts/indie-flower-latin-ext-400-normal.woff2",
        unicodeRange:
          "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
      },
      {
        name: "Lexend",
        global: true,
        weight: 300,
        style: "normal",
        display: "swap",
        src: "/fonts/lexend-latin-300-normal.woff2",
      },
      {
        name: "Lexend",
        global: true,
        weight: 400,
        style: "normal",
        display: "swap",
        src: "/fonts/lexend-latin-400-normal.woff2",
      },
      {
        name: "Lexend",
        global: true,
        weight: 500,
        style: "normal",
        display: "swap",
        src: "/fonts/lexend-latin-500-normal.woff2",
      },
      {
        name: "Lexend",
        global: true,
        weight: 600,
        style: "normal",
        display: "swap",
        src: "/fonts/lexend-latin-600-normal.woff2",
      },
      {
        name: "Lexend",
        global: true,
        weight: 700,
        style: "normal",
        display: "swap",
        src: "/fonts/lexend-latin-700-normal.woff2",
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
    public: {
      piniaPluginPersistedstate: {
        storage: "localStorage",
      },
    },
  },
});
