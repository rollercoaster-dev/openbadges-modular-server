/**
 * Tests for the Platform entity
 */
import { describe, test, expect } from 'bun:test';
import { Platform } from '@/domains/backpack/platform.entity';
import { PlatformStatus } from '@/domains/backpack/backpack.types';
import { Shared } from 'openbadges-types';

describe('Platform Entity', () => {
  // Test data
  const validPlatformData = {
    name: 'Test Platform',
    description: 'A test platform',
    clientId: 'test-client-id',
    publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0+JdYLHloVeU+HkZ3N5u\nYrDOCYSUxw/nPVYnFHLCvRSRnzXLBYAkWjgMdz7gV8Q0PE9XJU7S8yyGNuGCUgKd\nP9F9S5GJLzEbV4/d0w1Zz/xnQlkCDFGGvnmMYqFwcxDlr9zTm5K7bXl0ioGNYpfs\nZVo9AOsOTGQxkUbTAMBA+9+ZnkPCa2kVYnOLKgdCvN6u8wIDAQAB\n-----END PUBLIC KEY-----',
    webhookUrl: 'https://example.com/webhook',
    status: PlatformStatus.ACTIVE
  };

  test('should create a platform with factory method', () => {
    const platform = Platform.create(validPlatformData);

    expect(platform).toBeDefined();
    expect(platform.id).toBeDefined();
    expect(platform.name).toBe(validPlatformData.name);
    expect(platform.description).toBe(validPlatformData.description);
    expect(platform.clientId).toBe(validPlatformData.clientId);
    expect(platform.publicKey).toBe(validPlatformData.publicKey);
    expect(platform.webhookUrl).toBe(validPlatformData.webhookUrl);
    expect(platform.status).toBe(validPlatformData.status);
    expect(platform.createdAt).toBeInstanceOf(Date);
    expect(platform.updatedAt).toBeInstanceOf(Date);
  });

  test('should create a platform with custom ID', () => {
    const customId = 'custom-id' as Shared.IRI;
    const platform = Platform.create({
      ...validPlatformData,
      id: customId
    });

    expect(platform.id).toBe(customId);
  });

  test('should set default status if not provided', () => {
    const { status: _status, ...dataWithoutStatus } = validPlatformData;
    const platform = Platform.create(dataWithoutStatus);

    expect(platform.status).toBe(PlatformStatus.ACTIVE);
  });

  test('should convert to plain object', () => {
    const platform = Platform.create(validPlatformData);
    const obj = platform.toObject();

    expect(obj).toBeObject();
    expect(obj.id).toBe(platform.id);
    expect(obj.name).toBe(platform.name);
    expect(obj.description).toBe(platform.description);
    expect(obj.clientId).toBe(platform.clientId);
    expect(obj.publicKey).toBe(platform.publicKey);
    expect(obj.webhookUrl).toBe(platform.webhookUrl);
    expect(obj.status).toBe(platform.status);
    expect(obj.createdAt).toBe(platform.createdAt);
    expect(obj.updatedAt).toBe(platform.updatedAt);
  });
});
