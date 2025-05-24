# Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/) for commit messages to ensure consistent commit history and automated versioning through semantic-release.

## Commit Message Format

Each commit message consists of a **header**, an optional **body**, and an optional **footer**:

```text
<type>(<scope>): <subject>

<body>

<footer>
```

The **header** is mandatory and must conform to the [Commit Message Header](#commit-message-header) format.

The **body** is optional but recommended for providing additional contextual information about the change.

The **footer** is optional and can be used to reference issue tracker IDs or indicate breaking changes.

### Commit Message Header

The header has a specific format that includes a **type**, an optional **scope**, and a **subject**:

```text
<type>(<scope>): <subject>
```

#### Type

Must be one of the following:

* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation only changes
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
* **refactor**: A code change that neither fixes a bug nor adds a feature
* **perf**: A code change that improves performance
* **test**: Adding missing tests or correcting existing tests
* **build**: Changes that affect the build system or external dependencies
* **ci**: Changes to our CI configuration files and scripts
* **chore**: Other changes that don't modify src or test files
* **revert**: Reverts a previous commit

#### Scope

The scope is optional and should be a noun describing a section of the codebase:

* **api**: Changes to the API endpoints
* **auth**: Authentication-related changes
* **db**: Database-related changes
* **docker**: Docker configuration changes
* **issuer**: Changes to issuer functionality
* **badge**: Changes to badge class functionality
* **assertion**: Changes to assertion functionality
* **validation**: Changes to validation logic
* **config**: Configuration-related changes
* **deps**: Dependency updates

#### Subject

The subject contains a succinct description of the change:

* Use the imperative, present tense: "change" not "changed" nor "changes"
* Don't capitalize the first letter
* No period (.) at the end

### Body

The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

## Examples

```text
feat(api): add version endpoint

Add a new endpoint to expose the application version information.
```

```text
fix(db): resolve connection timeout issue

Increase connection timeout and add retry logic to prevent database connection failures.

Closes #123
```

```text
feat(auth): implement JWT authentication

BREAKING CHANGE: Authentication is now required for all API endpoints except health checks.
```

```text
docs(readme): update installation instructions

Update the installation instructions to include the new environment variables.
```

## Automatic Versioning

Following this convention allows semantic-release to automatically determine the next version number based on the types of commits:

* `fix` type → Patch release (1.0.0 → 1.0.1)
* `feat` type → Minor release (1.0.0 → 1.1.0)
* `BREAKING CHANGE` in body/footer or `!` after type/scope → Major release (1.0.0 → 2.0.0)

## Tools

To help follow this convention, you can use:

* [commitizen](https://github.com/commitizen/cz-cli) - Interactive CLI tool for creating formatted commit messages
* [commitlint](https://github.com/conventional-changelog/commitlint) - Lint commit messages against the convention
