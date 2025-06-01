# GitHub Copilot Configuration Guide

This document explains the GitHub Copilot custom instructions and prompt files configured for the OpenBadges Modular Server repository.

## Overview

The GitHub Copilot configuration is designed to help developers write code that:
- Follows the project's architectural patterns and coding standards
- Maintains Open Badges 3.0 specification compliance
- Uses proper TypeScript practices and type safety
- Implements secure coding practices
- Follows established database and testing patterns

## Configuration Files

### 1. Repository Custom Instructions (`.github/copilot-instructions.md`)

This file contains repository-wide instructions that are automatically applied to all Copilot interactions within this repository. It covers:

- **Code Quality & TypeScript Standards**: Strict typing, no `any` types, explicit return types
- **Import Patterns**: Use of `@/` path aliases instead of relative imports
- **Database Patterns**: Drizzle ORM usage, repository patterns, transaction handling
- **Security Requirements**: Open Badges compliance, proper validation, data sanitization
- **Testing Patterns**: Database-agnostic testing, proper isolation, specific status codes
- **Runtime Specifics**: Bun runtime usage, package management patterns

### 2. Prompt Files (`.github/prompts/`)

Reusable prompt files for common development tasks:

#### `create-repository.prompt.md`
- Guides creation of new repository classes
- Ensures proper Drizzle ORM patterns
- Implements type-safe database operations
- Follows established error handling patterns

#### `create-api-endpoint.prompt.md`
- Helps create new API endpoints with Hono framework
- Implements proper request validation with Zod
- Ensures consistent error handling and status codes
- Maintains authentication and authorization patterns

#### `database-migration.prompt.md`
- Guides database schema changes and migrations
- Ensures compatibility with both SQLite and PostgreSQL
- Maintains Open Badges 3.0 compliance in schema design
- Implements proper migration testing patterns

#### `create-test-suite.prompt.md`
- Helps create comprehensive test suites
- Ensures database-agnostic testing patterns
- Implements proper test isolation and cleanup
- Covers unit, integration, and E2E testing approaches

#### `security-review.prompt.md`
- Provides comprehensive security review checklist
- Covers authentication, authorization, and input validation
- Ensures proper handling of sensitive data
- Implements cryptographic security best practices

#### `openbadges-compliance.prompt.md`
- Ensures Open Badges 3.0 specification compliance
- Validates DID/IRI formats and required fields
- Implements proper badge verification patterns
- Maintains JSON-LD structure requirements

## How to Use

### Automatic Application
The repository custom instructions are automatically applied to all Copilot Chat interactions when working in this repository. No additional action is required.

### Using Prompt Files (VS Code)
1. Open Copilot Chat in VS Code
2. Click the "Attach context" icon (📎)
3. Select "Prompt..." from the dropdown
4. Choose the relevant prompt file for your task
5. Optionally add additional context or specific requirements
6. Submit your request

### Using Prompt Files (GitHub.com)
1. Go to [github.com/copilot](https://github.com/copilot)
2. Attach this repository as context
3. Reference the prompt file content in your conversation
4. The repository custom instructions will be automatically applied

## Best Practices

### When to Use Each Prompt File
- **create-repository.prompt.md**: Creating new data access layers
- **create-api-endpoint.prompt.md**: Adding new REST API endpoints
- **database-migration.prompt.md**: Modifying database schema
- **create-test-suite.prompt.md**: Writing comprehensive tests
- **security-review.prompt.md**: Reviewing code for security issues
- **openbadges-compliance.prompt.md**: Ensuring specification compliance

### Combining Prompts
You can combine multiple prompt files for complex tasks:
- Use repository + API endpoint prompts for full feature implementation
- Combine security review + compliance prompts for thorough validation
- Use migration + test suite prompts for database changes

### Customizing Prompts
Feel free to modify the prompt files to better suit specific needs:
- Add project-specific requirements
- Include additional validation rules
- Reference specific implementation examples

## Integration with Development Workflow

### ESLint Integration
The custom instructions complement the existing ESLint configuration by:
- Enforcing patterns that can't be caught by static analysis
- Providing context-aware suggestions for architectural decisions
- Ensuring compliance with domain-specific requirements (Open Badges)

### CI/CD Integration
The instructions help maintain code quality that passes CI checks by:
- Following established testing patterns that work in GitHub Actions
- Using proper Bun runtime commands and configurations
- Implementing security practices that pass automated scans

### Code Review Integration
The configuration supports the code review process by:
- Ensuring consistent coding patterns across the team
- Reducing the need for repetitive feedback on common issues
- Maintaining architectural consistency in new features

## Maintenance

### Updating Instructions
When updating the custom instructions or prompt files:
1. Test changes with sample Copilot interactions
2. Ensure compatibility with existing codebase patterns
3. Update this documentation to reflect changes
4. Consider team feedback and common development patterns

### Adding New Prompts
When adding new prompt files:
1. Follow the established format and structure
2. Include specific examples and patterns
3. Reference existing codebase implementations
4. Test with actual development scenarios

## Troubleshooting

### Instructions Not Applied
- Ensure you're working within the repository context
- Check that custom instructions are enabled in your Copilot settings
- Verify the `.github/copilot-instructions.md` file is present and valid

### Prompt Files Not Available
- Ensure prompt files are enabled in VS Code settings
- Check that files are in the correct `.github/prompts/` directory
- Verify file names end with `.prompt.md`

### Conflicting Suggestions
- Repository instructions take precedence over general Copilot knowledge
- Personal custom instructions override repository instructions
- Provide specific context when instructions seem contradictory

## Contributing

When contributing to this configuration:
1. Follow the established patterns in existing files
2. Test changes with actual development scenarios
3. Update documentation to reflect changes
4. Consider the impact on team development workflow
5. Ensure alignment with project architectural decisions
