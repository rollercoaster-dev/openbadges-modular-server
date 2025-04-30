module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  globals: {
    process: 'readonly',
    console: 'readonly',
    Buffer: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    Response: 'readonly',
    Request: 'readonly',
    Headers: 'readonly',
    fetch: 'readonly',
    TextEncoder: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    Bun: 'readonly',
  },
  rules: {
    'no-unused-vars': 'off',
    'no-console': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error'
  }
};
