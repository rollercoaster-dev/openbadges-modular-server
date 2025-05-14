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

- `GITHUB_TOKEN`: GitHub token for authentication (provided by GitHub Actions)
- `GH_TOKEN`: Same as GITHUB_TOKEN, but used by semantic-release
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
3. We set up Git identity explicitly to ensure proper commit attribution.
4. We use debug mode for semantic-release to get more detailed logs.
5. We've defined explicit release rules for different commit types.

### Docker Build Workflow (`docker-build.yml`)

The Docker build workflow is triggered when a new release is published by the release workflow. It builds and pushes a Docker image to the GitHub Container Registry (ghcr.io).

#### Configuration

- **Trigger**: Release published event or manual workflow dispatch
- **Permissions**: Read access to contents, write access to packages
- **Steps**:
  1. Checkout the repository at the release tag
  2. Set up Docker Buildx
  3. Login to GitHub Container Registry
  4. Extract metadata for Docker image
  5. Build and push the Docker image
  6. Update the Docker image description

#### Docker Image Tags

The Docker image is tagged with multiple versions to support different use cases:
- Full semantic version (e.g., `v1.2.3`)
- Major.minor version (e.g., `v1.2`)
- Major version only (e.g., `v1`)
- Branch name (for non-release builds)
- Short commit SHA (for debugging)

## Release Process Flow

The complete release process follows these steps:

1. Code is pushed to the `main` branch
2. The release workflow runs semantic-release to:
   - Determine the next version number
   - Update package.json and CHANGELOG.md
   - Create a git tag
   - Create a GitHub release
3. The GitHub release triggers the Docker build workflow
4. The Docker build workflow builds and pushes the Docker image to ghcr.io

## Troubleshooting

### Common Issues

1. **Release not created**: Check if your commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format.
2. **Authentication errors**: Ensure the workflow has the correct permissions set.
3. **NPM publishing errors**: These should not occur since we've disabled NPM publishing.
4. **Docker build failures**: Check the Dockerfile for errors or missing dependencies.
5. **Missing Docker image tags**: Ensure the release was properly created and tagged.

### Debugging

To debug the release process locally, you can run:

```bash
bun run release:dry-run
```

This will show what would happen during a release without making any changes.

To manually trigger a Docker build for a specific tag:

1. Go to the Actions tab in GitHub
2. Select the "Build and Push Docker Image" workflow
3. Click "Run workflow"
4. Enter the tag to build (e.g., `v1.0.0`) or leave empty for the latest release
