/**
 * Tests for the UserAssertion entity
 */
import { describe, test, expect } from 'bun:test';
import { UserAssertion } from '../../../src/domains/backpack/user-assertion.entity';
import { UserAssertionStatus } from '../../../src/domains/backpack/backpack.types';
import { Shared } from 'openbadges-types';

describe('UserAssertion Entity', () => {
  // Test data
  const validUserAssertionData = {
    userId: 'user-id' as Shared.IRI,
    assertionId: 'assertion-id' as Shared.IRI,
    status: UserAssertionStatus.ACTIVE,
    metadata: { source: 'test' }
  };

  test('should create a user assertion with factory method', () => {
    const userAssertion = UserAssertion.create(validUserAssertionData);

    expect(userAssertion).toBeDefined();
    expect(userAssertion.id).toBeDefined();
    expect(userAssertion.userId).toBe(validUserAssertionData.userId);
    expect(userAssertion.assertionId).toBe(validUserAssertionData.assertionId);
    expect(userAssertion.status).toBe(validUserAssertionData.status);
    expect(userAssertion.metadata).toEqual(validUserAssertionData.metadata);
    expect(userAssertion.addedAt).toBeInstanceOf(Date);
  });

  test('should create a user assertion with custom ID', () => {
    const customId = 'custom-id' as Shared.IRI;
    const userAssertion = UserAssertion.create({
      ...validUserAssertionData,
      id: customId
    });

    expect(userAssertion.id).toBe(customId);
  });

  test('should set default status if not provided', () => {
    const { status: _status, ...dataWithoutStatus } = validUserAssertionData;
    const userAssertion = UserAssertion.create(dataWithoutStatus);

    expect(userAssertion.status).toBe(UserAssertionStatus.ACTIVE);
  });

  test('should set custom addedAt if provided', () => {
    const customDate = new Date('2023-01-01');
    const userAssertion = UserAssertion.create({
      ...validUserAssertionData,
      addedAt: customDate
    });

    expect(userAssertion.addedAt).toBe(customDate);
  });

  test('should create a user assertion without optional fields', () => {
    const { metadata: _metadata, ...requiredData } = validUserAssertionData;
    const userAssertion = UserAssertion.create(requiredData);

    expect(userAssertion).toBeDefined();
    expect(userAssertion.id).toBeDefined();
    expect(userAssertion.userId).toBe(requiredData.userId);
    expect(userAssertion.assertionId).toBe(requiredData.assertionId);
    expect(userAssertion.status).toBe(requiredData.status);
    expect(userAssertion.metadata).toBeUndefined();
  });

  test('should convert to plain object', () => {
    const userAssertion = UserAssertion.create(validUserAssertionData);
    const obj = userAssertion.toObject();

    expect(obj).toBeObject();
    expect(obj.id).toBe(userAssertion.id);
    expect(obj.userId).toBe(userAssertion.userId);
    expect(obj.assertionId).toBe(userAssertion.assertionId);
    expect(obj.status).toBe(userAssertion.status);
    expect(obj.metadata).toEqual(userAssertion.metadata);
    expect(obj.addedAt).toBe(userAssertion.addedAt);
  });
});
