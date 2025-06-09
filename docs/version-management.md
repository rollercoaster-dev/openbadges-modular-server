# Version Management Guide

This document explains how to manage versions, handle failed releases, and transition between development and production versions.

## Quick Start

Use the interactive version management tool:

```bash
bun run version:manage
```

This tool provides options for:
- Setting beta/prerelease versions
- Cleaning up failed releases
- Managing tags and releases
- Preparing for next releases

## Current Situation

### Version Status
- **Current Production Version**: `1.0.9` (released June 7, 2025)
- **Latest Tag**: `v1.0.9`
- **Failed Release**: `v1.0.10` (attempted but failed during git push)
- **Next Expected**: `1.0.10` or `1.1.0-beta.1`

### What Happened
The release workflow failed when trying to create `v1.0.10` due to git push conflicts. The improved release workflow now handles this automatically, but we need to decide on version strategy going forward.

## Version Management Strategies

### Option 1: Continue with Patch Releases
**Best for**: Bug fixes and minor improvements

```bash
# Current: 1.0.9
# Next: 1.0.10, 1.0.11, etc.
bun run version:manage
# Select "Prepare for next release" → "Patch"
```

### Option 2: Move to Beta Development
**Best for**: Major feature development

```bash
# Current: 1.0.9
# Next: 1.1.0-beta.1, 1.1.0-beta.2, etc.
bun run version:manage
# Select "Set beta/prerelease version"
```

### Option 3: Prepare for Minor Release
**Best for**: New features ready for production

```bash
# Current: 1.0.9
# Next: 1.1.0
bun run version:manage
# Select "Prepare for next release" → "Minor"
```

## Handling Failed Releases

### Automatic Cleanup
The version management tool can detect and clean up failed releases:

```bash
bun run version:manage
# Select "Cleanup failed release"
```

This will:
- Detect version mismatches
- Reset package.json to last successful release
- Clean up any orphaned tags

### Manual Cleanup
If you need to manually clean up:

```bash
# Check current status
git tag -l | tail -5
git log --oneline -5

# Delete failed tag (if it exists)
git tag -d v1.0.10
git push origin :refs/tags/v1.0.10

# Reset version in package.json
# Edit package.json manually or use version:manage tool
```

## Beta/Prerelease Workflow

### Setting Up Beta Development

1. **Set beta version**:
   ```bash
   bun run version:manage
   # Select "Set beta/prerelease version"
   # Example: 1.1.0-beta.1
   ```

2. **Development cycle**:
   ```bash
   # Make changes, commit normally
   git add .
   git commit -m "feat: add new feature"
   
   # For next beta
   bun run version:manage
   # Increment to 1.1.0-beta.2
   ```

3. **Release beta**:
   ```bash
   # Push to trigger release workflow
   git push origin main
   # Creates v1.1.0-beta.1 release
   ```

4. **Promote to production**:
   ```bash
   bun run version:manage
   # Set to 1.1.0 (remove beta suffix)
   git push origin main
   # Creates v1.1.0 production release
   ```

### Beta Release Benefits
- **Safe testing**: Beta releases don't affect production users
- **Feature validation**: Test new features before production
- **Docker images**: Beta versions get their own Docker tags
- **Rollback safety**: Easy to revert to last stable version

## Semantic Versioning Strategy

### Version Format: `MAJOR.MINOR.PATCH[-PRERELEASE]`

- **MAJOR** (1.x.x): Breaking changes
- **MINOR** (x.1.x): New features (backward compatible)
- **PATCH** (x.x.1): Bug fixes
- **PRERELEASE**: alpha, beta, rc (release candidate)

### Examples
```
1.0.9          # Current production
1.0.10         # Next patch (bug fixes)
1.1.0-beta.1   # Next minor beta (new features)
1.1.0-beta.2   # Beta iteration
1.1.0          # Minor release (promote from beta)
2.0.0-alpha.1  # Major version alpha (breaking changes)
```

## Recommended Approach

### For Current Situation

Given the recent major features (JWT proofs, achievement versioning), I recommend:

1. **Set beta version for continued development**:
   ```bash
   bun run version:manage
   # Set to 1.1.0-beta.1
   ```

2. **Benefits**:
   - Clear separation from stable 1.0.x line
   - Safe testing of new features
   - Flexibility for breaking changes if needed
   - Professional versioning approach

3. **Timeline**:
   - **1.1.0-beta.1**: Current state with improved release workflow
   - **1.1.0-beta.2+**: Additional features/fixes
   - **1.1.0**: Stable release when ready

## Release Workflow Integration

### Automatic Releases
The improved release workflow handles:
- Version detection and validation
- Conflict resolution
- Retry logic for failed pushes
- Quality gates (tests, builds)

### Manual Releases
For manual control:
```bash
# Check if release is needed
bun run release:check

# Dry run to see what would happen
bun run release:dry-run

# Manual release
bun run release:manual
```

## Tag Management

### Viewing Tags
```bash
# List all tags
git tag -l

# Show recent tags
git tag -l | tail -10

# Show tag details
git show v1.0.9
```

### Deleting Tags
```bash
# Use the management tool (recommended)
bun run version:manage
# Select "Delete a tag"

# Or manually
git tag -d v1.0.10              # Delete local
git push origin :refs/tags/v1.0.10  # Delete remote
```

## Best Practices

### 1. Always Use Tools
- Use `bun run version:manage` for version changes
- Use `bun run release:check` before releases
- Avoid manual package.json edits

### 2. Follow Conventional Commits
```bash
feat: add new feature      # Minor version bump
fix: resolve bug          # Patch version bump
feat!: breaking change    # Major version bump
```

### 3. Test Before Release
```bash
# Run tests
bun test

# Check release status
bun run release:check

# Dry run
bun run release:dry-run
```

### 4. Document Changes
- Semantic-release generates CHANGELOG.md automatically
- Use clear commit messages
- Tag releases with meaningful descriptions

## Troubleshooting

### Common Issues

1. **Version mismatch**: Use `version:manage` cleanup
2. **Failed git push**: Improved workflow handles this
3. **Missing tags**: Check if release actually completed
4. **Wrong version**: Reset using version management tool

### Getting Help
```bash
# Check version status
bun run version:manage
# Select "Show version status"

# Check release status
bun run release:check

# View recent commits and tags
git log --oneline -10
git tag -l | tail -5
```
