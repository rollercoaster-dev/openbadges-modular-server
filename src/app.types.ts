import { Context } from 'hono';
import { User } from './domains/user/user.entity';
import { PlatformUser } from './domains/backpack/platform-user.entity';

// Define your Bindings and Variables here if you have them for Hono's context
// For example:
// type Bindings = {
//   DB: D1Database;
//   CACHE: KVNamespace;
// };
// type Variables = {
//   user?: User;
//   platformUser?: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'>;
//   requestId?: string;
// };

/**
 * Defines the custom Hono context for the application.
 * It can be extended with application-specific bindings (environment variables, services)
 * and variables (request-scoped data like authenticated user).
 */
export type HonoContext = Context<{
  Variables: {
    user?: User;
    platformUser?: Pick<
      PlatformUser,
      'platformId' | 'externalUserId' | 'displayName' | 'email'
    >;
    requestId?: string;
    validatedBody?: unknown; // Stores the validated request body from validation middleware
    // Add other request-scoped variables here as needed
  };
  // Bindings can be added here if you configure them with Hono's app.VARS or similar
  // Bindings: Bindings;
}>;
