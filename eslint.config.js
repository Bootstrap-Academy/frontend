const { defineConfig } = require("eslint/config");
const parser = require("vue-eslint-parser");
const js = require("@eslint/js");
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = defineConfig([{
  // ignore global files
  ignores: [
    "**/.output/**",
    "**/.nuxt/**",
    "**/dist/**",
    "**/coverage/**",
    "**/node_modules/**"
  ],
},
// ignore specific files
{ files: ["**/*.{js,ts,vue}"],
  extends: compat.extends(),
  languageOptions: {
    parser: parser,
    "sourceType": "module",
    parserOptions: {
      "parser": "@typescript-eslint/parser",
    },
  },
  rules: {
    "indent": ["error", 2],
  },
}
]);
