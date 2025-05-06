/**
 * Password Service
 *
 * This service handles password hashing and verification using bcrypt.
 * It provides methods for securely handling user passwords.
 */

import { logger } from '../../utils/logging/logger.service';

/**
 * Password service for hashing and verifying passwords
 */
export class PasswordService {
  /**
   * Default cost factor for bcrypt
   */
  private static readonly SALT_ROUNDS = 10;

  /**
   * Hash a password
   * @param password The plain text password
   * @returns The hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      // Import bcrypt dynamically to avoid issues with Bun
      const bcrypt = await import('bcrypt');
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      logger.logError('Failed to hash password', error as Error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify a password against a hash
   * @param password The plain text password
   * @param hash The hashed password
   * @returns True if the password matches the hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Import bcrypt dynamically to avoid issues with Bun
      const bcrypt = await import('bcrypt');
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.logError('Failed to verify password', error as Error);
      throw new Error('Password verification failed');
    }
  }

  /**
   * Generate a secure random password
   * @param length The length of the password (default: 12)
   * @returns A secure random password
   */
  static generateRandomPassword(length = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
    let password = '';

    // Generate cryptographically secure random values
    const randomValues = new Uint8Array(length);
    // Use crypto.subtle to access the global crypto object
    // @ts-ignore - TypeScript doesn't recognize crypto.getRandomValues in all environments
    globalThis.crypto.getRandomValues(randomValues);

    // Convert random values to password characters
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }

    return password;
  }

  /**
   * Check if a password meets security requirements
   * @param password The password to check
   * @returns True if the password meets requirements
   */
  static isPasswordSecure(password: string): boolean {
    // Password must be at least 8 characters long
    if (password.length < 8) {
      return false;
    }

    // Password must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Password must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Password must contain at least one digit
    if (!/[0-9]/.test(password)) {
      return false;
    }

    // Password must contain at least one special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return false;
    }

    return true;
  }
}
