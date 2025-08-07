# Rule: Do not edit CHANGELOG.md manually

**Summary**: `CHANGELOG.md` is generated automatically by semantic-release. Never modify it by hand.

## Rationale
- The changelog is produced from Conventional Commits during the release workflow.
- Manual edits cause merge conflicts, break automation, and create inconsistent release notes.

## Scope
- Applies to all contributors, all branches, and all PRs.
- Also applies to tags and release artifacts.

## Allowed
- Write clear Conventional Commit messages (feat, fix, docs, chore, refactor, perf, test).
- Add context in commit bodies and PR descriptions.
- Use `BREAKING CHANGE:` in commit body for breaking changes.

## Forbidden
- Editing `CHANGELOG.md` directly in any commit.
- Manually bumping versions in `package.json`.
- Creating/pushing release tags by hand.

## If you need to update release notes
- Update commit messages via `git commit --amend` or follow-up commits.
- Add descriptive PR text; it will be included in release notes where supported.

## References
- `docs/release-process.md` (Automated releases and changelog generation)
- `docs/version-management.md` (Versioning strategy and best practices)
- `CONTRIBUTING.md` (Contributor workflow; do not touch changelog)


