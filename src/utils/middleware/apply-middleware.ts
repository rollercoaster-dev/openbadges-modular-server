/**
 * Helper functions for applying middleware to Elysia routes
 */

import { Elysia } from 'elysia';
import { Context } from 'elysia';

/**
 * Apply a middleware function to an Elysia route
 * @param middleware The middleware function to apply
 * @returns An Elysia plugin that applies the middleware
 */
export function applyMiddleware(middleware: (context: Context) => void | Record<string, unknown>): Elysia {
  return new Elysia().derive(middleware);
}
