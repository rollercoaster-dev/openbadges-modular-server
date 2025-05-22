/**
 * PlatformUser entity representing a user from an external platform
 */
import { Shared } from 'openbadges-types';
import { createOrGenerateIRI } from '@utils/types/iri-utils';
import { PlatformUserMetadata } from './backpack.types';

export class PlatformUser {
  id: Shared.IRI;
  platformId: Shared.IRI;
  externalUserId: string;
  displayName?: string;
  email?: string;
  metadata?: PlatformUserMetadata;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: Partial<PlatformUser>) {
    Object.assign(this, data);
  }

  /**
   * Factory method to create a new PlatformUser instance
   * @param data The platform user data
   * @returns A new PlatformUser instance
   */
  static create(data: Partial<PlatformUser>): PlatformUser {
    // Generate ID if not provided
    if (!data.id) {
      data.id = createOrGenerateIRI();
    }

    // Set timestamps if not provided
    const now = new Date();
    if (!data.createdAt) {
      data.createdAt = now;
    }
    if (!data.updatedAt) {
      data.updatedAt = now;
    }

    return new PlatformUser(data);
  }

  /**
   * Converts the platform user to a plain object
   * @returns A plain object representation of the platform user
   */
  toObject(): Record<string, unknown> {
    return {
      id: this.id,
      platformId: this.platformId,
      externalUserId: this.externalUserId,
      displayName: this.displayName,
      email: this.email,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
