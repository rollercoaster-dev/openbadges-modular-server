import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/**
 * IMPORTANT: DO NOT MODIFY THESE ESLINT RULES TO MAKE THEM LESS STRICT
 *
 * - Never change rules from 'error' to 'warn' or 'off'
 * - Never disable TypeScript type checking rules
 * - If you're tempted to disable a rule, fix the code instead
 *
 * Key rules for catching missing imports and undefined variables:
 * - 'no-undef': Catches undefined variables and missing imports
 * - '@typescript-eslint/no-use-before-define': Catches functions used before definition
 * - '@typescript-eslint/explicit-module-boundary-types': Requires explicit return types
 *
 * Any PR that weakens these rules will be rejected.
 */

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '.github/**', '.husky/**', 'docs/examples/**']
  },
  // Configuration for TypeScript files in the project
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        console: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Web/Browser globals
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        File: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        structuredClone: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
        // Bun globals
        Bun: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // ESLint core rules
      'no-console': 'error', // NEVER DISABLE THIS RULE
      'no-unused-vars': 'off', // This is handled by @typescript-eslint/no-unused-vars
      'no-undef': 'error', // Catch undefined variables and missing imports
      'no-constant-condition': 'warn',

      // TypeScript rules - NEVER DISABLE THESE RULES
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  caughtErrorsIgnorePattern: '^_'
}],
      '@typescript-eslint/no-use-before-define': 'error', // Catch use of variables before definition
    }
  },
  // Configuration for TypeScript files outside the main project (like root-level scripts)
  {
    files: ['*.ts', 'scripts/**/*.ts', 'drizzle.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
        // No project config for standalone files
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        console: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Web/Browser globals
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        File: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        structuredClone: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
        // Bun globals
        Bun: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // ESLint core rules
      'no-console': 'error', // NEVER DISABLE THIS RULE
      'no-unused-vars': 'off', // This is handled by @typescript-eslint/no-unused-vars
      'no-undef': 'error', // Catch undefined variables and missing imports
      'no-constant-condition': 'warn',

      // TypeScript rules - NEVER DISABLE THESE RULES (but some may not work without project config)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  caughtErrorsIgnorePattern: '^_'
}],
      '@typescript-eslint/no-use-before-define': 'error', // Catch use of variables before definition
    }
  }
];
