module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/essential'
  ],
  plugins: ['@typescript-eslint', 'vue'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Basic rules
    'indent': ['error', 2],
    // Allow console calls
    'no-console': 'off',
    // Less strict TypeScript rules
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-require-imports': 'off',
    // Other adjustments
    'no-undef': 'warn',
    'no-extra-boolean-cast': 'warn'
  },
  ignorePatterns: [
    '.output/**/*',
    '.nuxt/**/*',
    'dist/**/*',
    'coverage/**/*',
    'node_modules/**/*'
  ]
}