/**
 * UserAssertion entity representing a badge in a user's backpack
 */
import { v4 as uuidv4 } from 'uuid';
import { Shared } from 'openbadges-types';
import { UserAssertionStatus, UserAssertionMetadata } from './backpack.types';

export class UserAssertion {
  id: Shared.IRI;
  userId: Shared.IRI;
  assertionId: Shared.IRI;
  addedAt: Date;
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
      data.id = uuidv4() as Shared.IRI;
    }

    // Set default status if not provided
    if (!data.status) {
      data.status = UserAssertionStatus.ACTIVE;
    }

    // Set addedAt if not provided
    if (!data.addedAt) {
      data.addedAt = new Date();
    }

    return new UserAssertion(data);
  }

  /**
   * Converts the user assertion to a plain object
   * @returns A plain object representation of the user assertion
   */
  toObject(): Record<string, unknown> {
    return {
      id: this.id,
      userId: this.userId,
      assertionId: this.assertionId,
      addedAt: this.addedAt,
      status: this.status,
      metadata: this.metadata
    };
  }
}
