/**
 * Platform entity representing an external platform that can integrate with the backpack
 */
import { v4 as uuidv4 } from 'uuid';
import { Shared } from 'openbadges-types';
import { PlatformStatus, PlatformMetadata } from './backpack.types';

export class Platform {
  id: Shared.IRI;
  name: string;
  description?: string;
  clientId: string;
  publicKey: string;
  webhookUrl?: string;
  status: PlatformStatus;
  metadata?: PlatformMetadata;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: Partial<Platform>) {
    Object.assign(this, data);
  }

  /**
   * Factory method to create a new Platform instance
   * @param data The platform data
   * @returns A new Platform instance
   */
  static create(data: Partial<Platform>): Platform {
    // Generate ID if not provided
    if (!data.id) {
      data.id = uuidv4() as Shared.IRI;
    }

    // Set default status if not provided
    if (!data.status) {
      data.status = PlatformStatus.ACTIVE;
    }

    // Set timestamps if not provided
    const now = new Date();
    if (!data.createdAt) {
      data.createdAt = now;
    }
    if (!data.updatedAt) {
      data.updatedAt = now;
    }

    return new Platform(data);
  }

  /**
   * Converts the platform to a plain object
   * @returns A plain object representation of the platform
   */
  toObject(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      clientId: this.clientId,
      publicKey: this.publicKey,
      webhookUrl: this.webhookUrl,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }
}
