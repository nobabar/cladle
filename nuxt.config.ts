// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // SSG configuration - Static Site Generation for MVP
  ssr: false,

  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxt/icon",
    "@pinia/nuxt",
    "@nuxt/test-utils/module",
    "@nuxtjs/color-mode",
  ],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

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
});
