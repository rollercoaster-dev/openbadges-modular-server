/**
 * Commitlint configuration for conventional commits
 * 
 * This configuration enforces the Conventional Commits specification
 * to ensure consistent commit messages for semantic-release.
 * 
 * @see https://commitlint.js.org/
 * @see https://www.conventionalcommits.org/
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Ensure the commit type is one of the allowed types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'build',    // Build system or external dependencies
        'ci',       // CI/CD changes
        'chore',    // Other changes that don't modify src or test files
        'revert'    // Reverting a previous commit
      ]
    ],
    // Ensure the subject is not empty
    'subject-empty': [2, 'never'],
    // Ensure the subject doesn't end with a period
    'subject-full-stop': [2, 'never', '.'],

    // Limit subject length
    'subject-max-length': [2, 'always', 72],
    // Ensure the type is not empty
    'type-empty': [2, 'never'],
    // Ensure the scope is lowercase if present
    'scope-case': [2, 'always', 'lower-case'],
    // Limit header length
    'header-max-length': [2, 'always', 100],
    // Ensure body has leading blank line
    'body-leading-blank': [2, 'always'],
    // Ensure footer has leading blank line
    'footer-leading-blank': [2, 'always'],
    // Disable footer line length for semantic-release compatibility
    'footer-max-line-length': [0, 'always', 100]
  }
};
