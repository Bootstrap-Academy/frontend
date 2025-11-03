import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    // only unit tests
    include: ["tests/unit/**/*.spec.{ts,js}"],
    // no e2e tests
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**", ".nuxt/**"],
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL(".", import.meta.url)),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
