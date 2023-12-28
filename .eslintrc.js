module.exports = {
  extends: [
    // 'eslint:recommended',
    // 'plugin:vue/vue3-recommended',
    // 'plugin:vue/recommended' // Use this if you are using Vue.js 2.x.
  ],
  rules: {
    'indent': ['error', 2]
  },
  parser: "vue-eslint-parser",
  parserOptions: {
    "parser": "@typescript-eslint/parser",
    "sourceType": "module"
  }
}
