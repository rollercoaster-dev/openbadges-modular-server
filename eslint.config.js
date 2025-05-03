import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/**
 * IMPORTANT: DO NOT MODIFY THESE ESLINT RULES TO MAKE THEM LESS STRICT
 *
 * - Never change rules from 'error' to 'warn' or 'off'
 * - Never disable TypeScript type checking rules
 * - If you're tempted to disable a rule, fix the code instead
 *
 * Any PR that weakens these rules will be rejected.
 */

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '.github/**', '.husky/**', 'docs/examples/**']
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // ESLint core rules
      'no-console': 'error', // NEVER DISABLE THIS RULE
      'no-unused-vars': 'off', // This is handled by @typescript-eslint/no-unused-vars
      'no-undef': 'off', // Handled by TypeScript
      'no-constant-condition': 'warn',

      // TypeScript rules - NEVER DISABLE THESE RULES
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  caughtErrorsIgnorePattern: '^_'
}]
    }
  }
];
