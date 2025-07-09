# [2.0.0](https://github.com/rollercoaster-dev/openbadges-modular-server/compare/v1.0.9...v2.0.0) (2025-07-09)


* Fix/release workflow manual trigger ([#61](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/61)) ([6a95d4f](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/6a95d4f1d4a51cbf915df0be1119d178a29eb2c1)), closes [#60](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/60)


### Bug Fixes

* **ci:** disable footer line length limit for semantic-release compatibility ([db1fe7b](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/db1fe7ba564a18f5d4fb013f103c3494fde8f726))
* **ci:** remove duplicate tests from release workflow ([#57](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/57)) ([64ba2c5](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/64ba2c5d706fa8ac2ffb8700e708c2ad3dc13852))
* enable persist-credentials for PAT_TOKEN in release workflow ([afecbe0](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/afecbe0eac3af1b1ef4ba5590af64d9c914efb20))
* enable semantic-release production mode ([#58](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/58)) ([e85bf06](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/e85bf06d535fec6255c020231af38c5626e994f7))
* handle multiline strings properly in repository dispatch action ([5331830](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/533183055706750878ab5dfb8a22e5ae4e406c89))
* improve release workflow with conflict resolution and beta version management ([#56](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/56)) ([693d4ef](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/693d4ef35d5110350242f4fe67518f706c20236b))
* properly parse JSON payload in repository dispatch action ([9f70dc0](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/9f70dc0ffad73ac4d6e71c213cec69e1dfbeefbf))
* update release workflow and streamline semantic-release process ([#63](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/63)) ([bd59215](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/bd59215470adb684ce161653675e559370893940))
* use GITHUB_TOKEN instead of PAT_TOKEN for semantic-release ([680ac26](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/680ac262446804beaec9de8a571a9d7aa76d1ad3))


### Features

* implement Open Badges 3.0 achievement versioning and relationships ([#55](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/55)) ([9fd94d5](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/9fd94d50a46400809f1028dd13650a9abc5558bc))
* implement unified CI/CD pipeline with sequential quality gates ([#59](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/59)) ([08ae512](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/08ae51238be8819e97946f2a467e850742d3021d))


### BREAKING CHANGES

* Reverted to semantic-release for version management

Security Fixes:
- Fix code injection vulnerability in workflow_run.head_branch usage
- Secure workflow_run trigger to prevent untrusted code execution
- Add comprehensive input sanitization and validation

Architecture Improvements:
- Restore semantic-release integration with proper .releaserc.json config
- Remove custom version management logic that bypassed semantic-release
- Simplify release workflow logic and reduce complexity
- Ensure TypeScript compliance across all workflow files

Quality Enhancements:
- Pin action versions to specific tags for automated maintenance
- Add comprehensive error handling with meaningful messages
- Implement matrix strategy for database testing (SQLite/PostgreSQL)
- Pin PostgreSQL image to specific version (postgres:15.8)
- Add YAML validation tooling

Testing:
- All workflows validated with yamllint
- Semantic-release dry-run successful
- CI pipeline tested with matrix strategy
- Both SQLite and PostgreSQL test paths verified

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<!-- CHANGELOG will be automatically updated by semantic-release -->
