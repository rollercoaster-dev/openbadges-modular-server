import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

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
      'no-console': 'error', 
      'no-unused-vars': 'error',
      'no-undef': 'error', 
      'no-constant-condition': 'warn',

      // TypeScript rules
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
