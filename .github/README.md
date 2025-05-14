# GitHub Workflows

This directory contains GitHub Actions workflow configurations for the Open Badges Modular Server project.

## Workflows

### Release Workflow (`release.yml`)

The release workflow is triggered when code is pushed to the `main` branch. It uses [semantic-release](https://github.com/semantic-release/semantic-release) to automate the versioning and release process.

#### Configuration

- **Trigger**: Push to `main` branch
- **Permissions**: Write access to contents, issues, and pull requests
- **Steps**:
  1. Checkout the repository with full history
  2. Set up Node.js and Bun
  3. Install dependencies
  4. Run tests
  5. Build the application
  6. Run semantic-release to create a new release

#### Environment Variables

- `GH_TOKEN`: GitHub token for authentication (provided by GitHub Actions)
- `NPM_TOKEN`: A dummy token to satisfy semantic-release requirements (not used for actual publishing)

### Semantic Release Configuration

The semantic-release configuration is defined in `.releaserc.json` at the root of the repository. It uses the following plugins:

- `@semantic-release/commit-analyzer`: Analyzes commit messages to determine the next version
- `@semantic-release/release-notes-generator`: Generates release notes based on commit messages
- `@semantic-release/changelog`: Updates the CHANGELOG.md file
- `@semantic-release/npm`: Updates the version in package.json (does not publish to NPM)
- `@semantic-release/git`: Commits the updated files back to the repository
- `@semantic-release/github`: Creates a GitHub release

#### Important Notes

1. The `@semantic-release/npm` plugin is configured with `npmPublish: false` since we're not publishing to NPM.
2. We're using a dummy NPM token to satisfy semantic-release requirements.
3. The release workflow uses `persist-credentials: true` to allow semantic-release to push changes back to the repository.

## Troubleshooting

### Common Issues

1. **Release not created**: Check if your commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format.
2. **Authentication errors**: Ensure the workflow has the correct permissions set.
3. **NPM publishing errors**: These should not occur since we've disabled NPM publishing.

### Debugging

To debug the release process locally, you can run:

```bash
bun run release:dry-run
```

This will show what would happen during a release without making any changes.
