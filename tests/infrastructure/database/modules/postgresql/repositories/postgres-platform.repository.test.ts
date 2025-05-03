/**
 * Tests for the PostgresPlatformRepository
 */
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { PostgresPlatformRepository } from '../../../../../../src/infrastructure/database/modules/postgresql/repositories/postgres-platform.repository';
import { Platform } from '../../../../../../src/domains/backpack/platform.entity';
// Import but prefix with _ to avoid unused var warning
import { PostgresPlatformMapper as _PostgresPlatformMapper } from '../../../../../../src/infrastructure/database/modules/postgresql/mappers/postgres-platform.mapper';

// Mock drizzle
const mockSelect = mock(() => mockSelect);
const mockFrom = mock(() => mockFrom);
const mockWhere = mock(() => []);
const mockInsert = mock(() => mockInsert);
const mockValues = mock(() => mockValues);
const mockReturning = mock(() => []);
const mockUpdate = mock(() => mockUpdate);
const mockSet = mock(() => ({ where: mockWhere, returning: mockReturning }));
const mockDelete = mock(() => ({ where: mockWhere, returning: mockReturning }));

mock.module('drizzle-orm/postgres-js', () => {
  return {
    drizzle: mock(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    }))
  };
});

// Mock the where method to include returning
mockWhere.mockImplementation(() => ({
  returning: mockReturning
}));

// Mock PostgresPlatformMapper
mock.module('../../../../../../src/infrastructure/database/modules/postgresql/mappers/postgres-platform.mapper', () => {
  const mockMapper = function() {
    return {
      toDomain: mock((record) => Platform.create(record)),
      toPersistence: mock((entity) => ({ ...entity }))
    };
  };

  return {
    PostgresPlatformMapper: mockMapper
  };
});

describe('PostgresPlatformRepository', () => {
  let repository: PostgresPlatformRepository;
  let mockClient: any;
  beforeEach(() => {
    // Reset mocks
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockClear();
    mockInsert.mockClear();
    mockValues.mockClear();
    mockReturning.mockClear();
    mockUpdate.mockClear();
    mockSet.mockClear();
    mockDelete.mockClear();

    // Setup mock returns
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockUpdate.mockReturnValue({ set: mockSet });

    // Create mock client
    mockClient = {};

    // Create repository
    repository = new PostgresPlatformRepository(mockClient as any);
  });

  test('should create a platform', async () => {
    const platformData = {
      name: 'Test Platform',
      clientId: 'client-id',
      publicKey: 'public-key'
    };

    // Setup mock to return a platform
    mockReturning.mockReturnValueOnce([{ id: 'platform-id', ...platformData }]);

    const result = await repository.create(platformData as any);

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalled();
    expect(mockReturning).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Platform);
    expect(result.id).toBe('platform-id');
  });

  test('should find all platforms', async () => {
    // Setup mock to return platforms
    mockFrom.mockReturnValueOnce([
      { id: 'platform-1', name: 'Platform 1' },
      { id: 'platform-2', name: 'Platform 2' }
    ]);

    const result = await repository.findAll();

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(result).toBeArray();
    expect(result.length).toBe(2);
    expect(result[0]).toBeInstanceOf(Platform);
    expect(result[1]).toBeInstanceOf(Platform);
  });

  test('should find a platform by ID', async () => {
    // Setup mock to return a platform
    mockWhere.mockReturnValueOnce([{ id: 'platform-id', name: 'Test Platform' }]);

    const result = await repository.findById('platform-id');

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Platform);
    expect(result?.id).toBe('platform-id');
  });

  test('should return null when platform not found by ID', async () => {
    // Setup mock to return empty array
    mockWhere.mockReturnValueOnce([]);

    const result = await repository.findById('non-existent');

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('should find a platform by client ID', async () => {
    // Setup mock to return a platform
    mockWhere.mockReturnValueOnce([{ id: 'platform-id', clientId: 'client-id' }]);

    const result = await repository.findByClientId('client-id');

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Platform);
    expect(result?.id).toBe('platform-id');
  });

  test('should update a platform', async () => {
    // Setup mock to return a platform for findById
    mockWhere.mockReturnValueOnce([{ id: 'platform-id', name: 'Old Name' }]);

    // Setup mock to return updated platform
    mockReturning.mockReturnValueOnce([{ id: 'platform-id', name: 'New Name' }]);

    const result = await repository.update('platform-id', { name: 'New Name' });

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalled();
    expect(mockReturning).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Platform);
    expect(result?.id).toBe('platform-id');
    expect(result?.name).toBe('New Name');
  });

  test('should return null when updating non-existent platform', async () => {
    // Setup mock to return empty array for findById
    mockWhere.mockReturnValueOnce([]);

    const result = await repository.update('non-existent', { name: 'New Name' });

    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('should delete a platform', async () => {
    // Setup mock to return deleted platform
    mockReturning.mockReturnValueOnce([{ id: 'platform-id' }]);

    const result = await repository.delete('platform-id');

    expect(mockDelete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockReturning).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('should return false when deleting non-existent platform', async () => {
    // Setup mock to return empty array
    mockReturning.mockReturnValueOnce([]);

    const result = await repository.delete('non-existent');

    expect(mockDelete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockReturning).toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
