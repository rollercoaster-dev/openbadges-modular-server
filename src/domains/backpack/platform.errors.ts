/**
 * Domain-specific error classes for the Platform domain
 */

/**
 * Error thrown when attempting to create a Platform with a duplicate clientId
 */
export class DuplicateClientIdError extends Error {
  constructor(
    clientId: string,
    message: string = `Platform with clientId "${clientId}" already exists`
  ) {
    super(message);
    this.name = 'DuplicateClientIdError';
    Object.setPrototypeOf(this, DuplicateClientIdError.prototype);
  }
}

/**
 * Error thrown when a Platform operation fails
 */
export class PlatformOperationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'PlatformOperationError';
    Object.setPrototypeOf(this, PlatformOperationError.prototype);
  }
}
