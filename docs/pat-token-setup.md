# PAT Token Setup Guide

## Overview

The release workflow requires a Personal Access Token (PAT) to trigger the Docker workflow after creating a release. The default `GITHUB_TOKEN` has limited permissions and cannot trigger other workflows.

## Why PAT_TOKEN is Required

1. **Workflow Triggering**: The default `GITHUB_TOKEN` cannot trigger other workflows for security reasons
2. **Cross-Workflow Communication**: The release workflow needs to trigger the Docker workflow
3. **Enhanced Permissions**: PAT provides the necessary permissions to push tags and trigger workflows

## Setup Instructions

### 1. Create a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set the following:
   - **Note**: `openbadges-release-workflow`
   - **Expiration**: Choose appropriate expiration (90 days recommended)
   - **Scopes**: Select the following permissions:
     - `repo` (Full control of private repositories)
     - `workflow` (Update GitHub Action workflows)
     - `write:packages` (Upload packages to GitHub Package Registry)

### 2. Add Token to Repository Secrets

1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Set:
   - **Name**: `PAT_TOKEN`
   - **Secret**: Paste the token you created

### 3. Verify Setup

The token is used in `.github/workflows/release.yml`:

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.PAT_TOKEN }}
    persist-credentials: false
```

## Security Considerations

1. **Minimal Permissions**: Only grant the minimum required scopes
2. **Regular Rotation**: Rotate the token every 90 days or as needed
3. **Monitor Usage**: Check the token usage in GitHub settings
4. **Team Access**: Limit who can view/modify repository secrets

## Troubleshooting

### Token Not Working
- Verify the token has the correct scopes
- Check if the token has expired
- Ensure the token is added to the correct repository

### Workflow Still Failing
- Check the workflow logs for specific error messages
- Verify the token name matches exactly: `PAT_TOKEN`
- Ensure the repository has the necessary permissions

### Permission Denied Errors
- The token may need additional scopes
- Check if the repository is private (requires `repo` scope)
- Verify the token owner has the necessary repository permissions

## Alternative Solutions

If you prefer not to use a PAT token, consider:

1. **GitHub App**: Create a GitHub App with specific permissions
2. **Separate Workflows**: Trigger Docker builds through other means
3. **Manual Triggers**: Use workflow_dispatch for manual releases

## Related Documentation

- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Workflow Triggering](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow)
