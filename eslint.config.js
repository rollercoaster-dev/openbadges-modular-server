import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '.github/**', '.husky/**']
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
      'no-console': 'off', // Temporarily disabled
      'no-unused-vars': 'off',
      'no-undef': 'off', // Handled by TypeScript
      'no-constant-condition': 'warn',

      // TypeScript rules
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Temporarily disabled
      '@typescript-eslint/no-explicit-any': 'off', // Temporarily disabled
      '@typescript-eslint/no-unused-vars': 'error'
    }
  }
];
