/**
 * UserAssertion entity representing a badge in a user's backpack
 */
import { Shared } from 'openbadges-types';
import { UserAssertionStatus, UserAssertionMetadata } from './backpack.types';
import { createOrGenerateIRI } from '@utils/types/iri-utils';

/**
 * Interface for the data returned by UserAssertion.toObject()
 */
export interface UserAssertionData {
  id: Shared.IRI;
  userId: Shared.IRI;
  assertionId: Shared.IRI;
  addedAt: Date;
  updatedAt: Date;
  status: UserAssertionStatus;
  metadata?: UserAssertionMetadata;
}

export class UserAssertion {
  id: Shared.IRI;
  userId: Shared.IRI;
  assertionId: Shared.IRI;
  addedAt: Date;
  updatedAt: Date;
  status: UserAssertionStatus;
  metadata?: UserAssertionMetadata;

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: Partial<UserAssertion>) {
    Object.assign(this, data);
  }

  /**
   * Factory method to create a new UserAssertion instance
   * @param data The user assertion data
   * @returns A new UserAssertion instance
   */
  static create(data: Partial<UserAssertion>): UserAssertion {
    // Generate ID if not provided
    if (!data.id) {
      data.id = createOrGenerateIRI();
    }

    // Set default status if not provided
    if (!data.status) {
      data.status = UserAssertionStatus.ACTIVE;
    }

    // Set addedAt if not provided
    if (!data.addedAt) {
      data.addedAt = new Date();
    }

    // Set updatedAt if not provided, defaults to addedAt time initially
    if (!data.updatedAt) {
      data.updatedAt = data.addedAt || new Date();
    }

    return new UserAssertion(data);
  }

  /**
   * Converts the user assertion to a plain object
   * @returns A properly typed representation of the user assertion
   */
  toObject(): UserAssertionData {
    return {
      id: this.id,
      userId: this.userId,
      assertionId: this.assertionId,
      addedAt: this.addedAt,
      updatedAt: this.updatedAt,
      status: this.status,
      metadata: this.metadata,
    };
  }
}
