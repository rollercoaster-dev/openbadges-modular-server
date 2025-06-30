# Repository Dispatch Action

This composite action and bash script provide a centralized way to trigger downstream workflows using GitHub's `repository_dispatch` API with a Personal Access Token (PAT).

## Overview

The repository dispatch feature allows you to trigger workflows in response to activity outside of GitHub. This is particularly useful for:

- Triggering deployments from CI/CD pipelines
- Starting integration tests after successful builds
- Coordinating workflows across multiple repositories
- Creating custom webhook-like behavior

## Files

- `action.yml` - Composite GitHub Action
- `README.md` - This documentation
- `../../scripts/repository-dispatch.sh` - Standalone bash script

## Composite Action Usage

### Basic Example

```yaml
- name: Trigger Docker Build
  uses: ./.github/actions/repository-dispatch
  with:
    github-token: ${{ secrets.GH_PAT }}
    event-type: 'docker_build'
```

### Advanced Example

```yaml
- name: Trigger Deployment
  uses: ./.github/actions/repository-dispatch
  with:
    github-token: ${{ secrets.GH_PAT }}
    event-type: 'deploy'
    client-payload: |
      {
        "environment": "production",
        "version": "${{ github.sha }}",
        "branch": "${{ github.ref_name }}"
      }
    target-owner: 'my-org'
    target-repo: 'deployment-repo'
```

### Cross-Repository Trigger

```yaml
- name: Trigger Integration Tests
  uses: ./.github/actions/repository-dispatch
  with:
    github-token: ${{ secrets.GH_PAT }}
    event-type: 'integration_test'
    target-owner: 'my-org'
    target-repo: 'integration-tests'
    client-payload: |
      {
        "source_repo": "${{ github.repository }}",
        "commit_sha": "${{ github.sha }}",
        "pull_request": "${{ github.event.number }}"
      }
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub Personal Access Token with `repo` scope | ✅ | - |
| `owner` | Repository owner | ❌ | `${{ github.repository_owner }}` |
| `repo` | Repository name | ❌ | `${{ github.event.repository.name }}` |
| `event-type` | Event type for the repository dispatch | ✅ | - |
| `client-payload` | Optional JSON payload to send with the dispatch | ❌ | `{}` |
| `target-owner` | Target repository owner (if different from source) | ❌ | - |
| `target-repo` | Target repository name (if different from source) | ❌ | - |

### Outputs

| Output | Description |
|--------|-------------|
| `dispatch-url` | The URL that was called for the dispatch |
| `response-status` | HTTP response status code |

## Bash Script Usage

The bash script provides the same functionality but can be used outside of GitHub Actions or in environments where composite actions aren't available.

### Basic Usage

```bash
# Using environment variables
export GH_PAT="your_token_here"
./.github/scripts/repository-dispatch.sh --event-type docker_build

# Using command line arguments
./.github/scripts/repository-dispatch.sh \
  --token "$GH_PAT" \
  --event-type docker_build
```

### Advanced Usage

```bash
# With custom payload
./.github/scripts/repository-dispatch.sh \
  --token "$GH_PAT" \
  --event-type deploy \
  --payload '{"environment":"staging","version":"v1.2.3"}'

# Cross-repository dispatch
./.github/scripts/repository-dispatch.sh \
  --token "$GH_PAT" \
  --event-type integration_test \
  --target-owner my-org \
  --target-repo test-suite \
  --payload '{"source":"main-app","branch":"feature-branch"}'
```

### Script Options

| Option | Description | Required | Environment Variable |
|--------|-------------|----------|---------------------|
| `-t, --token` | GitHub Personal Access Token | ✅ | `GH_PAT` |
| `-o, --owner` | Repository owner | ❌ | `OWNER` |
| `-r, --repo` | Repository name | ❌ | `REPO` |
| `-e, --event-type` | Event type for dispatch | ✅ | - |
| `-p, --payload` | JSON payload | ❌ | - |
| `--target-owner` | Target repository owner | ❌ | - |
| `--target-repo` | Target repository name | ❌ | - |
| `-h, --help` | Show help message | ❌ | - |

## Receiving Repository Dispatch Events

To handle repository dispatch events in your target repository, create a workflow that triggers on `repository_dispatch`:

```yaml
name: Handle Repository Dispatch
on:
  repository_dispatch:
    types: [docker_build, deploy, integration_test]

jobs:
  handle-event:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Handle Docker Build Event
        if: github.event.action == 'docker_build'
        run: |
          echo "Docker build triggered"
          echo "Client payload: ${{ toJson(github.event.client_payload) }}"
      
      - name: Handle Deploy Event
        if: github.event.action == 'deploy'
        run: |
          echo "Deploy triggered for environment: ${{ github.event.client_payload.environment }}"
          echo "Version: ${{ github.event.client_payload.version }}"
      
      - name: Handle Integration Test Event
        if: github.event.action == 'integration_test'
        run: |
          echo "Integration tests triggered"
          echo "Source repo: ${{ github.event.client_payload.source_repo }}"
          echo "Commit SHA: ${{ github.event.client_payload.commit_sha }}"
```

## GitHub Token Requirements

The GitHub Personal Access Token must have the following scopes:

- `repo` - Full control of private repositories (required for repository dispatch)

For organization repositories, the token owner must have:
- Write access to the target repository
- Permission to trigger workflows in the target repository

## Security Considerations

1. **Store tokens securely**: Always use GitHub Secrets to store your PAT
2. **Scope limitation**: Use tokens with minimal required scopes
3. **Payload validation**: Validate client payload in receiving workflows
4. **Access control**: Ensure tokens only have access to necessary repositories

## Error Handling

The action and script provide detailed error messages for common issues:

- **401 Unauthorized**: Check token validity and permissions
- **403 Forbidden**: Token lacks required scopes or repository access
- **404 Not Found**: Repository doesn't exist or isn't accessible
- **422 Unprocessable Entity**: Invalid event type or payload format

## Examples in Practice

### CI/CD Pipeline Integration

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and Test
        run: |
          # Your build and test steps here
          echo "Build completed successfully"
      
      - name: Trigger Docker Build
        if: success()
        uses: ./.github/actions/repository-dispatch
        with:
          github-token: ${{ secrets.GH_PAT }}
          event-type: 'docker_build'
          client-payload: |
            {
              "commit_sha": "${{ github.sha }}",
              "branch": "${{ github.ref_name }}",
              "build_number": "${{ github.run_number }}"
            }
```

### Multi-Repository Coordination

```yaml
name: Deploy Coordination
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options: [staging, production]

jobs:
  coordinate-deployment:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Backend Deployment
        uses: ./.github/actions/repository-dispatch
        with:
          github-token: ${{ secrets.GH_PAT }}
          event-type: 'deploy'
          target-owner: 'my-org'
          target-repo: 'backend-service'
          client-payload: |
            {
              "environment": "${{ inputs.environment }}",
              "coordinator": "${{ github.repository }}",
              "triggered_by": "${{ github.actor }}"
            }
      
      - name: Trigger Frontend Deployment
        uses: ./.github/actions/repository-dispatch
        with:
          github-token: ${{ secrets.GH_PAT }}
          event-type: 'deploy'
          target-owner: 'my-org'
          target-repo: 'frontend-app'
          client-payload: |
            {
              "environment": "${{ inputs.environment }}",
              "coordinator": "${{ github.repository }}",
              "triggered_by": "${{ github.actor }}"
            }
```

## Troubleshooting

### Common Issues

1. **Token permissions**: Ensure your PAT has `repo` scope
2. **Repository access**: Verify the token owner has access to target repositories
3. **Event type naming**: Use consistent, descriptive event type names
4. **JSON payload**: Ensure client payload is valid JSON

### Debugging

Enable debug logging in your workflows:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

Or add debug output to your scripts:

```bash
export DEBUG=1
./.github/scripts/repository-dispatch.sh --event-type test
```
