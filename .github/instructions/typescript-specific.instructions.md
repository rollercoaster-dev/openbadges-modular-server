---
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript Specific Instructions

Apply these TypeScript-specific rules in addition to the general coding guidelines.

## Type Safety
- Always use explicit return types for functions
- Never use `any` type - use `unknown` or proper type definitions
- Use strict TypeScript configuration
- Prefer `interface` over `type` for object definitions
- Use `const assertions` for immutable data

## Import Patterns
- Use `@/` path aliases instead of relative imports
- Group imports: external libraries first, then internal modules
- Use type-only imports when importing only types: `import type { User } from '@/types'`

## Error Handling
- Use typed error classes that extend Error
- Implement proper error boundaries with specific error types
- Use Result<T, E> pattern for operations that can fail

## Database Types
- Use Drizzle ORM's inferred types for database operations
- Define proper TypeScript interfaces for entity types
- Use branded types for IDs and sensitive values like DIDs/IRIs
