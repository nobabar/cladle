import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// h3 is a transitive dependency (via Nuxt); resolve it from there so server handlers load in tests.
const h3Entry = createRequire(createRequire(import.meta.url).resolve("nuxt/package.json")).resolve("h3");

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup-vitest.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.worktree-*/**",
      "tests/e2e/**",
      "playwright.config.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
      "@": fileURLToPath(new URL("./app", import.meta.url)),
      "#test": fileURLToPath(new URL("./tests", import.meta.url)),
      "h3": h3Entry,
    },
  },
});
