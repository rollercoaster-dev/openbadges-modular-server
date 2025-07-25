# Contributing to BadgeForge - Open Badges API

Thank you for your interest in contributing to the BadgeForge project! This document outlines the process for contributing to the repository.

## Getting Started

### Prerequisites

Before contributing, ensure you have:
- [Bun](https://bun.sh/) (v1.0.0 or higher)
- Git configured with your GitHub account
- A fork of the repository (for external contributors)

### Setup

1. Clone your fork or the main repository:
   ```bash
   git clone https://github.com/your-username/openbadges-modular-server.git
   cd openbadges-modular-server
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run the tests to ensure everything is working:
   ```bash
   bun test
   ```

## Development Workflow

### Authentication & Push Process

**Important**: No `gh auth` step is required for pushing changes. All pushes to the repository are handled via the `GITHUB_TOKEN` that is automatically configured in the GitHub Actions workflows.

When working with the repository:
- Use standard Git authentication for your personal access
- The CI/CD pipeline handles automated operations using `GITHUB_TOKEN`
- Manual token authentication is not required for normal development workflows

### Making Changes

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-fix-name
   ```

2. Make your changes following the project's coding standards
3. Write or update tests for your changes
4. Ensure all tests pass:
   ```bash
   bun test
   bun run lint
   bun run typecheck
   ```

5. Commit your changes following the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # or
   git commit -m "fix: resolve issue with..."
   ```

6. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```

7. Create a pull request through the GitHub web interface

### Code Quality

The project enforces code quality through:
- **Pre-commit hooks**: Lint and type check staged files
- **Pre-push hooks**: Run full test suite before pushing
- **Commit message validation**: Ensures conventional commit format
- **CI pipeline**: Runs comprehensive tests on all pull requests

### Testing

Run the appropriate tests for your changes:
```bash
# Full test suite
bun test

# Database-specific tests
bun run test:sqlite
bun run test:pg

# End-to-end tests
bun run test:e2e

# With coverage
bun run test:coverage
```

## Pull Request Process

### Before Submitting

1. Ensure your code follows the project's architectural patterns
2. Add or update documentation as needed
3. Update the CHANGELOG.md if your changes are user-facing
4. Ensure all tests pass and maintain good coverage
5. Verify your changes work with both SQLite and PostgreSQL (if applicable)

### Pull Request Guidelines

1. **Title**: Use a descriptive title that follows conventional commit format
2. **Description**: Provide a clear description of what your changes do
3. **Testing**: Describe how you tested your changes
4. **Documentation**: Note any documentation updates needed
5. **Breaking Changes**: Clearly mark any breaking changes

### Review Process

1. All pull requests require review from project maintainers
2. Automated checks (CI pipeline) must pass
3. Address any feedback from reviewers
4. Once approved, maintainers will merge your pull request

## Release Process

Releases are handled automatically through the CI/CD pipeline:

- **Automated Releases**: When changes are merged to `main` or `beta` branches
- **Version Calculation**: Based on conventional commit messages
- **GitHub Actions**: Handles tagging, building, and publishing
- **Docker Images**: Automatically built and published to GitHub Container Registry

**Do not create or push tags manually** - this can interfere with the automated release process.

## Development Guidelines

### Architecture

The project follows Domain-Driven Design principles:
- Keep domain logic separate from infrastructure concerns
- Use the repository pattern for data access
- Implement proper error handling and logging
- Follow TypeScript best practices

### Database Support

When adding database-related features:
- Ensure compatibility with both SQLite and PostgreSQL
- Use the existing database abstraction layer
- Add tests for both database types
- Follow the patterns established in existing database modules

### Security

- Follow secure coding practices
- Validate all inputs properly
- Use established cryptographic libraries
- Never commit secrets or sensitive information

## GitHub Copilot Integration

This repository includes comprehensive GitHub Copilot configuration:
- Custom instructions are automatically applied
- Use prompt files in `.github/prompts/` for common tasks
- Follow the established patterns and best practices

## Getting Help

- **Documentation**: Check the `docs/` directory for comprehensive guides
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Code Review**: Maintainers will provide feedback on pull requests

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.
