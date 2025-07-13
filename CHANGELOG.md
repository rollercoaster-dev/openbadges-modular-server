# 1.0.0 (2025-07-13)


* Fix/release workflow manual trigger ([#61](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/61)) ([6a95d4f](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/6a95d4f1d4a51cbf915df0be1119d178a29eb2c1)), closes [#60](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/60)


### Bug Fixes

* address Copilot review comments ([0dc59f4](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/0dc59f4ca2855d126e335f5cd48393eee5941399))
* **ci:** add required fields for GitHub branch protection API ([#84](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/84)) ([c790b2e](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/c790b2e4693f2f8cfb6de5e025e1c2b64265f090))
* **ci:** correct GitHub CLI syntax for branch protection API calls ([#86](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/86)) ([1142cda](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/1142cda58566ad3960fb5424a564323145decd87))
* **ci:** disable footer line length limit for semantic-release compatibility ([db1fe7b](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/db1fe7ba564a18f5d4fb013f103c3494fde8f726))
* **ci:** remove duplicate tests from release workflow ([#57](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/57)) ([64ba2c5](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/64ba2c5d706fa8ac2ffb8700e708c2ad3dc13852))
* **ci:** use proper JSON structure for GitHub branch protection API ([#85](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/85)) ([a19cd00](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/a19cd000158cf90fce1dff696318e406392eb3d5))
* **ci:** use token-in-URL for semantic-release git authentication ([#87](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/87)) ([b1fd073](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/b1fd073f5de16c97eaf7f570fdafeaadd0138305))
* clean slate release setup with semantic-release npm plugin ([#72](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/72)) ([e781996](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/e781996ff224b181848d5ce6251cf11efedfc918))
* complete Phase 2 - use PAT_TOKEN for all semantic-release operations ([#77](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/77)) ([0e26118](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/0e261186991424fc8db60c6d0bc692b7063a4015))
* configure git URL rewriting for semantic-release authentication ([#79](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/79)) ([2397689](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/239768943a483b4e577681ace21553289c2b68cc))
* configure semantic-release for beta releases from main branch ([#73](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/73)) ([a34f4f8](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/a34f4f873eeda7316a4f669633f0c1333c4960e8))
* correct typo in task documentation for branch and commit guidelines ([6ab5ac8](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/6ab5ac836a45c65bde666d4ff002c941eddb4d76))
* disable admin enforcement to resolve semantic-release failures ([#75](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/75)) ([deb445f](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/deb445f125deb0f2e455c325a45de75bd8e3540d))
* disable git hooks during release to prevent redundant test execution ([#82](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/82)) ([e833ce2](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/e833ce2a76b51fff6cd2e1336611bef0eb3d435b))
* enable persist-credentials for PAT_TOKEN in release workflow ([afecbe0](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/afecbe0eac3af1b1ef4ba5590af64d9c914efb20))
* enable semantic-release production mode ([#58](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/58)) ([e85bf06](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/e85bf06d535fec6255c020231af38c5626e994f7))
* Fix linting warnings ([02e8e52](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/02e8e529362bdf59e0f9f4c53aa742408636ba4f))
* handle multiline strings properly in repository dispatch action ([5331830](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/533183055706750878ab5dfb8a22e5ae4e406c89))
* improve release workflow with conflict resolution and beta version management ([#56](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/56)) ([693d4ef](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/693d4ef35d5110350242f4fe67518f706c20236b))
* prevent duplicate CI pipeline runs ([e22c236](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/e22c2366f77d08217b7bfecc53839e187cf08cfa))
* properly parse JSON payload in repository dispatch action ([9f70dc0](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/9f70dc0ffad73ac4d6e71c213cec69e1dfbeefbf))
* remove unnecessary pushArgs from semantic-release git configuration ([45a5328](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/45a53287b738adcec6beb286244bf2ea3bbc7826))
* remove unnecessary pushArgs from semantic-release git configuration ([#81](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/81)) ([3706c6a](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/3706c6abb982efd97ecdd0cb3793e98aba0c7086))
* replace git URL rewriting with direct remote URL for semantic-release ([#80](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/80)) ([7c63246](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/7c632464751a996e648b75e44b15f73f804e6fb5))
* skip PostgreSQL tests in CI environment ([d719205](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/d719205c44a6c92e133e093ab1b0d115a6665375))
* Stabilize DB schema and regenerate migrations ([#18](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/18)) ([a4260c3](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/a4260c37334fa18d74cdbef101d3fe843cfb27dd)), closes [#66](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/66) [#67](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/67) [#68](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/68) [#70](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/70) [#71](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/71) [#72](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/72)
* undo revert ([db7201b](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/db7201b8cea2d173d876e54fc780087b9bc546f3))
* update CI configuration for better-sqlite3 support ([a534807](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/a534807600a7120a9d5e1c987cad974eff89b720))
* update PostgreSQL mappers and tests ([75f115f](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/75f115fbad3941eec557fc5a2f4fcd0ea764b0d8))
* update release workflow and streamline semantic-release process ([#63](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/63)) ([bd59215](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/bd59215470adb684ce161653675e559370893940))
* use GITHUB_TOKEN instead of PAT_TOKEN for semantic-release ([680ac26](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/680ac262446804beaec9de8a571a9d7aa76d1ad3))
* use PAT token for semantic-release to bypass branch protection ([#74](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/74)) ([03692e4](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/03692e4f228c7d0599562290408045600fb63138))


### Features

* **api:** update server startup logging to include OpenAPI documentation URLs ([050f033](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/050f03345484c70ab76b768ac5c2241cfeedc401))
* **auth:** add documentation for authentication integration adapters ([befc62a](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/befc62a556ab5ac4f1c3f7fc6fd1e3d05dad314c))
* **auth:** enhance BasicAuthAdapter to handle passwords with colons and improve OAuth2Adapter token verification methods ([30bc591](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/30bc5918a065d3edcc83643bee292899828a48e6))
* **auth:** implement multiple authentication adapters (API Key, Basic Auth, OAuth2) ([280f079](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/280f0799964a4be83b29397d5619749fec80e7c7))
* complete batch credential retrieval and status update endpoints ([4795ff8](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/4795ff80fcfd8dd6384e094b22e7d77e8b5d7a36))
* **db:** Add cache service implementation ([e67fa6c](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/e67fa6c4a1db7a6545e38f03c2ad4609707563a6))
* **db:** Add graceful shutdown handling ([c1cc94e](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/c1cc94ea2c4cb085b74bbdf442d6237d181b85da))
* **db:** Add indexes to SQLite schema ([fd42f4b](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/fd42f4b5da677a341696e65e95a89b8e1364a582))
* **db:** Add SQLite performance optimizations ([e88c626](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/e88c626936a546572db42b121b5af86c5b8e8873))
* **db:** Configure Drizzle Kit for migrations with environment variable support ([fbe5244](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/fbe5244737d17fd27473398fdaf8b66e847d7e18))
* **db:** Enhance TypeScript path mappings and document openbadges-types review ([9b0d14f](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/9b0d14f7836cb94fd0c84796fde4c3f2ba748e88))
* **db:** Generate initial database migrations ([b236fd1](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/b236fd1cbc40d71c8be60dc8736649d19ebb0c92))
* **db:** Implement database health check endpoint ([8db476b](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/8db476b830c02b3b0fb675340aabe85559cb14fa))
* **db:** Optimize database queries ([7249c74](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/7249c7481ff03a9e6a4953d875c09d5c20f9dc20))
* **db:** Update Docker setup for migrations with health checks ([1948e2f](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/1948e2f75b1adb0208ca0a3071a2ff9fdc20b4d6))
* **db:** Update production configuration ([c867bd0](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/c867bd0cab21bf36b0fcf294a6d4432d51a74793))
* Enhance DB tests, config docs, and fix timestamp util ([#10](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/10)) ([ceff06b](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/ceff06b9dfd996d9f9794b451139a9b51ad56ea3))
* Fix Issuer Field in VerifiableCredential for v3.0 Compliance ([#47](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/47)) ([dcedc24](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/dcedc24df01e548af6cad0a4ab98ffbe05dc841d))
* implement batch credential creation endpoint ([5fb47ad](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/5fb47adbe352b3ef41e2c6a0a14ad5ee970f1e20))
* implement batch operations DTOs and validation schemas ([014f6f5](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/014f6f5d575f41d1d6e11f2851a36c603c03c7a8))
* implement JWKS endpoint (Priority 1.3 tasks) ([#49](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/49)) ([8800d36](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/8800d368bd51c1d26e341c6804631a10febb4572))
* Implement JWT proof generation and verification for Open Badges 3.0 ([#54](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/54)) ([1a7965b](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/1a7965bc593774cd93d6040e24e43ef17285f7b9))
* implement Open Badges 3.0 achievement versioning and relationships ([#55](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/55)) ([9fd94d5](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/9fd94d50a46400809f1028dd13650a9abc5558bc))
* Implement Open Badges 3.0 Compliant API Endpoint Naming ([#48](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/48)) ([b99fc8b](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/b99fc8b40fa597dacaf72d0f966b64ae25c9cb6f))
* Implement Priority 2.2 - Batch Operations for Credentials ([#51](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/51)) ([7cfd4ff](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/7cfd4ffd1920b781cca3337312fc6a8210c14f81))
* Implement security middleware for Open Badges API, including rate limiting and security headers & rate limiting middleware, type fixes, sqlite as default ([9168e3d](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/9168e3dce1711b27df9bc7423f9668308dec6862))
* implement task sync automation with compliance edge case fixes ([#71](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/71)) ([362249d](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/362249d0c89190a899397cca8bf241de876167d9))
* implement unified CI/CD pipeline with sequential quality gates ([#59](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/59)) ([08ae512](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/08ae51238be8819e97946f2a467e850742d3021d))
* Implement Zod validation for API controllers ([#19](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/19)) ([7490079](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/74900796a041ba45deb9b1692002526981645f90))
* **logging:** Implement neuro-friendly logging with Chalk integration and add global error handling middleware ([7f3c3b7](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/7f3c3b75f8612fce44e5cb88eb7c495513f19411))
* replace PAT_TOKEN with GitHub App authentication ([#78](https://github.com/rollercoaster-dev/openbadges-modular-server/issues/78)) ([e7d0eea](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/e7d0eead60a5e9307080c56bc319dbd47020c720))


### Reverts

* Revert "Remove MVP review plan with TypeScript/ESLint issues and update main MVP review plan" ([cc957fd](https://github.com/rollercoaster-dev/openbadges-modular-server/commit/cc957fd841e908112450b6aea040542570186df2))


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
