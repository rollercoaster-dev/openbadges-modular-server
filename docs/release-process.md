# Release Process Guide

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and release management. This document explains how releases are created and how to use the available release scripts.

## Automatic Releases

Releases are automatically created when code is merged to the `main` branch. The release process is handled by GitHub Actions and semantic-release.

### How It Works

1. When code is merged to `main`, the GitHub Actions workflow in `.github/workflows/release.yml` is triggered.
2. semantic-release analyzes the commit messages since the last release.
3. Based on the commit messages, semantic-release determines the next version number:
   - `fix:` commits trigger a patch release (1.0.0 → 1.0.1)
   - `feat:` commits trigger a minor release (1.0.0 → 1.1.0)
   - `feat!:`, `fix!:`, or commits with `BREAKING CHANGE:` in the body trigger a major release (1.0.0 → 2.0.0)
4. semantic-release then:
   - Updates the version in `package.json`
   - Updates the `CHANGELOG.md` file
   - Creates a git tag for the release
   - Creates a GitHub release with release notes

## Manual Releases

While the automatic release process is recommended, there are several scripts available for manual releases:

### Dry Run

To see what would happen during a release without actually making changes:

```bash
bun run release:dry-run
```

This will show you the next version number and the changes that would be included in the release.

### Local Release

To create a release locally (not recommended for production):

```bash
bun run release:local
```

This will create a release locally, updating the version in `package.json` and the `CHANGELOG.md` file, but will not push to GitHub or create a GitHub release.

### Forcing a Specific Release Type

Sometimes you may want to force a specific release type (major, minor, or patch) regardless of the commit messages:

```bash
# Force a major release (1.0.0 → 2.0.0)
bun run release:major

# Force a minor release (1.0.0 → 1.1.0)
bun run release:minor

# Force a patch release (1.0.0 → 1.0.1)
bun run release:patch
```

These commands will create a release of the specified type, regardless of the commit messages.

## Release Process Best Practices

### 1. Follow Conventional Commits

Always follow the [Conventional Commits](https://www.conventionalcommits.org/) format for your commit messages. This ensures that semantic-release can correctly determine the next version number.

See [commit-convention.md](./commit-convention.md) for details on our commit message format.

### 2. Use Feature Branches

Always work in feature branches and create pull requests to merge your changes to `main`. This ensures that:

- Code is reviewed before being merged
- The release process is triggered only when code is merged to `main`
- Each PR can be associated with a specific release

### 3. Squash Commits When Merging

When merging a PR, consider squashing the commits to create a single, well-formatted commit message. This makes the release notes cleaner and more readable.

### 4. Include Breaking Changes in Commit Messages

If your changes include breaking changes, make sure to include `BREAKING CHANGE:` in the commit message body or use the `!` syntax in the type (e.g., `feat!:`). This ensures that semantic-release will create a major release.

Example:

```
feat!: change API endpoint format

BREAKING CHANGE: The API endpoint format has changed from /api/v1/resource to /api/resource/v1.
```

### 5. Test Before Releasing

Always run tests before creating a release:

```bash
bun test
```

## Troubleshooting

### Release Not Created

If a release is not created when you expect it to be, check:

1. Are your commit messages following the Conventional Commits format?
2. Are you on the `main` branch?
3. Has there been any change since the last release?
4. Check the GitHub Actions logs for errors.

### Manual Release Failed

If a manual release fails, check:

1. Do you have the necessary permissions?
2. Are you on the `main` branch?
3. Is your local repository up to date with the remote?
4. Are there any conflicts with the remote repository?

## Additional Resources

- [semantic-release documentation](https://github.com/semantic-release/semantic-release)
- [Conventional Commits specification](https://www.conventionalcommits.org/)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
