const parser = require("vue-eslint-parser");
const js = require("@eslint/js");
const vue = require("eslint-plugin-vue");
const ts = require("@typescript-eslint/eslint-plugin");

const asList = (cfg) => (Array.isArray(cfg) ? cfg : [cfg]); // for eather object or array

module.exports = [
  {
    // ignore global files
    ignores: ["**/.output/**", "**/.nuxt/**", "**/dist/**", "**/coverage/**", "**/node_modules/**"],
  },

  // base config flat
  ...asList(js.configs.recommended), // @eslint/js flat-config-object
  ...asList(vue.configs["flat/recommended"]), // eslint-plugin-vue 10.x (Array format)

  // ts rules
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      parser,
      parserOptions: { parser: "@typescript-eslint/parser" },
    },
    plugins: {
      "@typescript-eslint": ts,
    },
    rules: {
      ...ts.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // test rules
  {
    files: ["tests/**/*.spec.{js,ts}"],
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
      },
    },
  },

  // common rules
  {
    files: ["**/*.{js,ts,vue}"],
    languageOptions: {
      parser,
      sourceType: "module",
      parserOptions: { parser: "@typescript-eslint/parser" },
    },
    plugins: {
      vue,
      "@typescript-eslint": ts,
    },
    rules: {
      indent: ["error", 2],
    },
  },
];
