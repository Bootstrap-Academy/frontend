const { defineConfig } = require("eslint/config");
const vueParser = require("vue-eslint-parser");
const tsParser = require("@typescript-eslint/parser");
const prettierConfig = require("eslint-config-prettier/flat");
const vuePlugin = require("eslint-plugin-vue");

module.exports = defineConfig([
  {
    ignores: ["**/node_modules/**", "**/.nuxt/**", "**/.output/**", "dist/**"],
  },
  {
    files: ["**/*.vue"],
    plugins: {
      vue: vuePlugin,
    },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: require.resolve("@typescript-eslint/parser"),
        sourceType: "module",
        ecmaVersion: "latest",
      },
    },
    rules: {},
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
      ecmaVersion: "latest",
    },
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  prettierConfig,
]);
