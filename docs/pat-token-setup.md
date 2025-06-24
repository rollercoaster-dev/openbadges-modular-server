# Token Management and Setup Guide

## Overview

This project uses **organization-level encrypted secrets** for better security and management. The release workflow requires a Personal Access Token (PAT) to trigger workflows across repositories. Organization-level secrets provide centralized management, enhanced security, and simplified maintenance. As of now, classic PATs should be avoided in favor of GitHub Apps or fine-grained PATs.

## Why Organization-Level Secrets are Preferred

1. **Centralized Management**: Single point of control for secrets across multiple repositories
2. **Enhanced Security**: Granular access control and audit logging
3. **Simplified Maintenance**: Update once, applies to all authorized repositories
4. **Better Compliance**: Easier to manage secret rotation and access policies
5. **Reduced Risk**: Less chance of secrets being accidentally exposed in individual repositories

## Setup Instructions

### 1. Create a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set the following:
   - **Note**: `openbadges-org-release-workflow`
   - **Expiration**: Choose appropriate expiration (90 days recommended)
   - **Scopes**: Select the following permissions:
     - `repo` (Full control of private repositories)
     - `workflow` (Update GitHub Action workflows)
     - `write:packages` (Upload packages to GitHub Package Registry)

### 2. Add Token to Organization Secrets (RECOMMENDED)

1. Go to **Organization → Settings → Secrets and variables → Actions**
2. Click "New organization secret"
3. Set:
   - **Name**: `ORG_RELEASE_PAT`
   - **Secret**: Paste the token you created
   - **Repository access**: Select "Selected repositories" and choose the relevant repositories
     - `openbadges-modular-server`
     - Any other repositories that need to run the release workflow

### 3. Alternative: Repository-Level Secret (Legacy)

⚠️ **DEPRECATED**: Use organization-level secrets instead for better security

1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Set:
   - **Name**: `PAT_TOKEN` (being phased out)
   - **Secret**: Paste the token you created

## Migration from Repository-Level to Organization-Level Secrets

### Current State (To Be Deprecated)
This repository currently uses `PAT_TOKEN` as a repository-level secret. This approach has several limitations:
- Secret management scattered across repositories
- Potential for inconsistent token permissions
- Difficult to audit and rotate secrets
- Higher risk of accidental exposure

### Target State (Recommended)
Using `ORG_RELEASE_PAT` as an organization-level secret provides:
- Centralized secret management
- Consistent permissions across repositories
- Easier audit trail and compliance
- Simplified secret rotation process

### Migration Steps

1. **Set up organization-level secret** (see step 2 above)
2. **Update workflow files** to use the new secret name
3. **Test the new configuration** with a manual workflow run
4. **Remove the old repository-level secret** to avoid confusion
5. **Update documentation** to reflect the new approach

### 4. Verify Setup

The token is used in `.github/workflows/release.yml` and `.github/workflows/main.yml`:

**Current usage (to be updated):**
```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.PAT_TOKEN }}  # OLD - repository-level
    persist-credentials: false
```

**Recommended usage:**
```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.ORG_RELEASE_PAT }}  # NEW - organization-level
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
- Ensure the token is added to the correct organization or repository
- Verify the repository has access to the organization-level secret

### Workflow Still Failing
- Check the workflow logs for specific error messages
- Verify the token name matches exactly: `ORG_RELEASE_PAT` (new) or `PAT_TOKEN` (legacy)
- Ensure the repository has the necessary permissions
- For organization-level secrets, verify the repository is included in the allowed list

### Permission Denied Errors
- The token may need additional scopes
- Check if the repository is private (requires `repo` scope)
- Verify the token owner has the necessary repository permissions

## Alternative Solutions

If you prefer not to use a PAT token, consider:

1. **GitHub App**: Create a GitHub App with specific permissions
2. **Separate Workflows**: Trigger Docker builds through other means
3. **Manual Triggers**: Use workflow_dispatch for manual releases

## Cleanup: Removing Legacy Repository-Level Secrets

Once you've successfully migrated to organization-level secrets, it's important to clean up the old repository-level secrets to avoid confusion:

### Steps to Remove PAT_TOKEN (Repository-Level)

1. **Verify the new setup is working**:
   - Run a test workflow to ensure `ORG_RELEASE_PAT` is functioning correctly
   - Check workflow logs for any authentication errors

2. **Remove the repository-level secret**:
   - Go to Repository → Settings → Secrets and variables → Actions
   - Find `PAT_TOKEN` in the repository secrets list
   - Click the "Remove" or "Delete" button
   - Confirm the deletion

3. **Update any remaining documentation**:
   - Search for references to `PAT_TOKEN` in documentation
   - Update them to reference `ORG_RELEASE_PAT` instead
   - Update any setup guides or README files

### Verification Checklist

- [ ] Organization-level secret `ORG_RELEASE_PAT` is created
- [ ] Repository has access to the organization-level secret
- [ ] Workflow files are updated to use `ORG_RELEASE_PAT`
- [ ] Test workflow run completes successfully
- [ ] Repository-level `PAT_TOKEN` is removed
- [ ] Documentation is updated

## Benefits Summary

After migration to organization-level secrets:

✅ **Centralized Management**: All repositories use the same secret
✅ **Enhanced Security**: Better access control and audit trails
✅ **Simplified Rotation**: Update once, applies everywhere
✅ **Reduced Risk**: No scattered secrets across repositories
✅ **Better Compliance**: Easier to meet security requirements

## Related Documentation

- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Organization Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-an-organization)
- [Workflow Triggering](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow)
