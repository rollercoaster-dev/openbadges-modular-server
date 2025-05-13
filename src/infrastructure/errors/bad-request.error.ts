/**
 * Custom error class for 400 Bad Request errors
 * 
 * This error class is used to indicate client errors (HTTP 400)
 * where the request cannot be processed due to client-side issues.
 */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}
