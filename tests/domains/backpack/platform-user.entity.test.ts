/**
 * Tests for the PlatformUser entity
 */
import { describe, test, expect } from 'bun:test';
import { PlatformUser } from '@/domains/backpack/platform-user.entity';
import { Shared } from 'openbadges-types';

describe('PlatformUser Entity', () => {
  // Test data
  const validPlatformUserData = {
    platformId: 'platform-id' as Shared.IRI,
    externalUserId: 'external-user-id',
    displayName: 'Test User',
    email: 'test@example.com',
    metadata: { role: 'user' }
  };

  test('should create a platform user with factory method', () => {
    const platformUser = PlatformUser.create(validPlatformUserData);

    expect(platformUser).toBeDefined();
    expect(platformUser.id).toBeDefined();
    expect(platformUser.platformId).toBe(validPlatformUserData.platformId);
    expect(platformUser.externalUserId).toBe(validPlatformUserData.externalUserId);
    expect(platformUser.displayName).toBe(validPlatformUserData.displayName);
    expect(platformUser.email).toBe(validPlatformUserData.email);
    expect(platformUser.metadata).toEqual(validPlatformUserData.metadata);
    expect(platformUser.createdAt).toBeInstanceOf(Date);
    expect(platformUser.updatedAt).toBeInstanceOf(Date);
  });

  test('should create a platform user with custom ID', () => {
    const customId = 'custom-id' as Shared.IRI;
    const platformUser = PlatformUser.create({
      ...validPlatformUserData,
      id: customId
    });

    expect(platformUser.id).toBe(customId);
  });

  test('should create a platform user without optional fields', () => {
    const { displayName: _displayName, email: _email, metadata: _metadata, ...requiredData } = validPlatformUserData;
    const platformUser = PlatformUser.create(requiredData);

    expect(platformUser).toBeDefined();
    expect(platformUser.id).toBeDefined();
    expect(platformUser.platformId).toBe(requiredData.platformId);
    expect(platformUser.externalUserId).toBe(requiredData.externalUserId);
    expect(platformUser.displayName).toBeUndefined();
    expect(platformUser.email).toBeUndefined();
    expect(platformUser.metadata).toBeUndefined();
  });

  test('should convert to plain object', () => {
    const platformUser = PlatformUser.create(validPlatformUserData);
    const obj = platformUser.toObject();

    expect(obj).toBeObject();
    expect(obj.id).toBe(platformUser.id);
    expect(obj.platformId).toBe(platformUser.platformId);
    expect(obj.externalUserId).toBe(platformUser.externalUserId);
    expect(obj.displayName).toBe(platformUser.displayName);
    expect(obj.email).toBe(platformUser.email);
    expect(obj.metadata).toEqual(platformUser.metadata);
    expect(obj.createdAt).toBe(platformUser.createdAt);
    expect(obj.updatedAt).toBe(platformUser.updatedAt);
  });
});
