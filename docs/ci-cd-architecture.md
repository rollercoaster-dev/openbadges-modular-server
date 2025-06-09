# CI/CD Architecture Guide

This document describes the new unified CI/CD pipeline architecture for the OpenBadges Modular Server project.

## 🎯 **Overview**

The new CI/CD system uses a **single, sequential workflow** that ensures quality gates are enforced at every stage. This replaces the previous multi-workflow approach with a more reliable, maintainable system.

## 🏗️ **Architecture Principles**

### **1. Sequential Quality Gates**
Each stage must pass before proceeding to the next:
```
Lint & TypeCheck → SQLite Tests → PostgreSQL Tests → E2E Tests → Build → Release → Docker
```

### **2. Fail Fast Strategy**
- **Linting & Type Checking**: Fastest feedback on code quality
- **SQLite Tests**: Quick database testing (no external dependencies)
- **PostgreSQL Tests**: Comprehensive database testing
- **E2E Tests**: Full application testing

### **3. Secure Release Process**
- Releases only happen on `main` branch
- All tests must pass before release
- Semantic versioning with conventional commits
- Multi-architecture Docker builds

## 📋 **Workflow Stages**

### **Stage 1: Code Quality** 🔍
```yaml
lint-and-typecheck:
  - ESLint validation
  - TypeScript type checking
  - Fast feedback on code quality issues
```

**Purpose**: Catch syntax errors, style issues, and type problems early.

### **Stage 2: SQLite Tests** 🗄️
```yaml
test-sqlite:
  needs: lint-and-typecheck
  - SQLite database setup
  - Unit and integration tests
  - Coverage reporting
```

**Purpose**: Fast database testing without external dependencies.

### **Stage 3: PostgreSQL Tests** 🐘
```yaml
test-postgresql:
  needs: test-sqlite
  - PostgreSQL service container
  - Database migrations
  - Full test suite with PostgreSQL
```

**Purpose**: Ensure compatibility with production database.

### **Stage 4: End-to-End Tests** 🧪
```yaml
test-e2e:
  needs: test-postgresql
  strategy:
    matrix:
      database: [sqlite, postgresql]
  - Full application testing
  - API endpoint validation
  - Real-world scenario testing
```

**Purpose**: Validate complete application functionality.

### **Stage 5: Build** 🏗️
```yaml
build:
  needs: test-e2e
  - Application compilation
  - Asset optimization
  - Build artifact creation
```

**Purpose**: Prepare application for deployment.

### **Stage 6: Release** 🚀
```yaml
release:
  needs: build
  if: github.ref == 'refs/heads/main'
  - Semantic version analysis
  - Changelog generation
  - GitHub release creation
  - Git tag creation
```

**Purpose**: Automated versioning and release management.

### **Stage 7: Docker Build** 🐳
```yaml
docker:
  needs: release
  if: needs.release.outputs.new_release_published == 'true'
  - Multi-architecture builds (AMD64, ARM64)
  - Container registry publishing
  - Architecture verification
```

**Purpose**: Container deployment preparation.

## 🔧 **Configuration**

### **Triggers**
- **Push to main**: Full pipeline including release
- **Pull Request**: All stages except release and docker
- **Manual Dispatch**: Full pipeline with optional force release

### **Environment Variables**
```yaml
NODE_VERSION: '20'
BUN_VERSION: 'latest'
```

### **Permissions**
```yaml
contents: write      # For creating releases and tags
issues: write        # For release comments
pull-requests: write # For PR comments
packages: write      # For container registry
id-token: write      # For provenance
```

## 📊 **Benefits**

### **Reliability**
- ✅ No releases without passing tests
- ✅ Clear dependency chain
- ✅ Atomic operations

### **Performance**
- ⚡ Fail fast on code quality issues
- ⚡ Optimized caching strategy
- ⚡ Parallel E2E testing

### **Maintainability**
- 📝 Single workflow file
- 📝 Clear stage dependencies
- 📝 Comprehensive logging

### **Security**
- 🔒 Minimal permissions
- 🔒 Secure token handling
- 🔒 Verified multi-arch builds

## 🔄 **Migration Guide**

### **From Old System**
The previous system had separate workflows:
- `ci.yml` - Testing
- `release.yml` - Releases
- `docker-build.yml` - Container builds
- `test-release.yml` - Release testing

### **Migration Steps**
1. **Backup existing workflows**:
   ```bash
   bun run scripts/migrate-workflows.js backup
   ```

2. **Run full migration**:
   ```bash
   bun run scripts/migrate-workflows.js migrate
   ```

3. **Verify migration**:
   ```bash
   bun run scripts/migrate-workflows.js status
   ```

4. **Rollback if needed**:
   ```bash
   bun run scripts/migrate-workflows.js rollback
   ```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Tests Failing**
```bash
# Check specific test stage
gh run list --workflow=main.yml
gh run view <run-id>
```

#### **Release Not Created**
- Ensure commits follow conventional commit format
- Check semantic-release configuration
- Verify GitHub token permissions

#### **Docker Build Failing**
- Check multi-architecture support
- Verify container registry permissions
- Review Dockerfile compatibility

### **Debug Commands**
```bash
# Local testing
bun run test:sqlite
bun run test:pg:with-docker
bun run test:e2e

# Release testing
bun run release:dry-run
bun run release:check

# Workflow validation
bun run scripts/migrate-workflows.js status
```

## 📈 **Monitoring**

### **Key Metrics**
- **Pipeline Duration**: Target <15 minutes
- **Success Rate**: Target >99% for valid code
- **Test Coverage**: Maintain >80%
- **Release Frequency**: Automated on every merge

### **Alerts**
- Failed releases
- Test failures
- Security vulnerabilities
- Performance regressions

## 🔮 **Future Enhancements**

### **Planned Improvements**
- [ ] Parallel test execution optimization
- [ ] Advanced caching strategies
- [ ] Integration with external monitoring
- [ ] Automated security scanning
- [ ] Performance benchmarking

### **Beta/Alpha Branches**
The system supports prerelease branches:
- `beta` branch → beta releases (e.g., 1.2.0-beta.1)
- `alpha` branch → alpha releases (e.g., 1.2.0-alpha.1)

## 📚 **References**

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Release](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Docker Multi-Architecture](https://docs.docker.com/build/building/multi-platform/)

---

**Last Updated**: 2025-01-09  
**Version**: 1.0.0  
**Maintainer**: Development Team
