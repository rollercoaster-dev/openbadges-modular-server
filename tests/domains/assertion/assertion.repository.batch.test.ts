/**
 * Unit tests for assertion repository batch operations
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Assertion } from '../../../src/domains/assertion/assertion.entity';
import { AssertionRepository } from '../../../src/domains/assertion/assertion.repository';

// Mock implementation of AssertionRepository for testing
class MockAssertionRepository implements Partial<AssertionRepository> {
  private assertions: Map<string, Assertion> = new Map();

  async createBatch(assertionList: Omit<Assertion, 'id'>[]): Promise<Array<{
    success: boolean;
    assertion?: Assertion;
    error?: string;
  }>> {
    const results: Array<{
      success: boolean;
      assertion?: Assertion;
      error?: string;
    }> = [];

    for (const assertionData of assertionList) {
      try {
        // Simulate validation - fail if recipient identity is 'invalid'
        if ((assertionData.recipient as any)?.identity === 'invalid') {
          results.push({
            success: false,
            error: 'Invalid recipient identity',
          });
          continue;
        }

        const assertion = Assertion.create(assertionData);
        this.assertions.set(assertion.id, assertion);
        
        results.push({
          success: true,
          assertion,
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async findByIds(ids: any[]): Promise<(Assertion | null)[]> {
    return ids.map(id => this.assertions.get(id) || null);
  }

  async updateStatusBatch(updates: Array<{
    id: any;
    status: 'revoked' | 'suspended' | 'active';
    reason?: string;
  }>): Promise<Array<{
    id: any;
    success: boolean;
    assertion?: Assertion;
    error?: string;
  }>> {
    const results: Array<{
      id: any;
      success: boolean;
      assertion?: Assertion;
      error?: string;
    }> = [];

    for (const update of updates) {
      const assertion = this.assertions.get(update.id);
      
      if (!assertion) {
        results.push({
          id: update.id,
          success: false,
          error: 'Assertion not found',
        });
        continue;
      }

      try {
        // Update the assertion status
        const updatedData: Partial<Assertion> = {};
        
        switch (update.status) {
          case 'revoked':
            updatedData.revoked = true;
            updatedData.revocationReason = update.reason || 'Revoked';
            break;
          case 'suspended':
            updatedData.revoked = true;
            updatedData.revocationReason = update.reason || 'Suspended';
            break;
          case 'active':
            updatedData.revoked = false;
            updatedData.revocationReason = undefined;
            break;
        }

        // Create updated assertion
        const updatedAssertion = Assertion.create({
          ...assertion,
          ...updatedData,
        });

        this.assertions.set(update.id, updatedAssertion);

        results.push({
          id: update.id,
          success: true,
          assertion: updatedAssertion,
        });
      } catch (error) {
        results.push({
          id: update.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // Helper method to clear test data
  clear(): void {
    this.assertions.clear();
  }
}

describe('Assertion Repository Batch Operations', () => {
  let repository: MockAssertionRepository;

  beforeEach(() => {
    repository = new MockAssertionRepository();
  });

  describe('createBatch', () => {
    it('should create multiple assertions successfully', async () => {
      // Arrange
      const assertionsToCreate = [
        {
          recipient: { identity: 'user1@example.com' },
          badgeClass: 'badge-class-1',
          evidence: [{ id: 'evidence-1' }],
        },
        {
          recipient: { identity: 'user2@example.com' },
          badgeClass: 'badge-class-1',
          evidence: [{ id: 'evidence-2' }],
        },
      ] as Omit<Assertion, 'id'>[];

      // Act
      const results = await repository.createBatch(assertionsToCreate);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].assertion).toBeDefined();
      expect(results[0].assertion?.recipient.identity).toBe('user1@example.com');
      expect(results[1].success).toBe(true);
      expect(results[1].assertion).toBeDefined();
      expect(results[1].assertion?.recipient.identity).toBe('user2@example.com');
    });

    it('should handle partial failures in batch creation', async () => {
      // Arrange
      const assertionsToCreate = [
        {
          recipient: { identity: 'user1@example.com' },
          badgeClass: 'badge-class-1',
          evidence: [{ id: 'evidence-1' }],
        },
        {
          recipient: { identity: 'invalid' }, // This will fail
          badgeClass: 'badge-class-1',
          evidence: [{ id: 'evidence-2' }],
        },
        {
          recipient: { identity: 'user3@example.com' },
          badgeClass: 'badge-class-1',
          evidence: [{ id: 'evidence-3' }],
        },
      ] as Omit<Assertion, 'id'>[];

      // Act
      const results = await repository.createBatch(assertionsToCreate);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[0].assertion).toBeDefined();
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Invalid recipient identity');
      expect(results[2].success).toBe(true);
      expect(results[2].assertion).toBeDefined();
    });

    it('should handle empty batch', async () => {
      // Arrange
      const assertionsToCreate: Omit<Assertion, 'id'>[] = [];

      // Act
      const results = await repository.createBatch(assertionsToCreate);

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('findByIds', () => {
    it('should find existing assertions by IDs', async () => {
      // Arrange
      const assertionsToCreate = [
        {
          recipient: { identity: 'user1@example.com' },
          badgeClass: 'badge-class-1',
          evidence: [{ id: 'evidence-1' }],
        },
        {
          recipient: { identity: 'user2@example.com' },
          badgeClass: 'badge-class-1',
          evidence: [{ id: 'evidence-2' }],
        },
      ] as Omit<Assertion, 'id'>[];

      const createResults = await repository.createBatch(assertionsToCreate);
      const ids = createResults
        .filter(r => r.success && r.assertion)
        .map(r => r.assertion!.id);

      // Act
      const foundAssertions = await repository.findByIds(ids);

      // Assert
      expect(foundAssertions).toHaveLength(2);
      expect(foundAssertions[0]).toBeDefined();
      expect(foundAssertions[0]?.id).toBe(ids[0]);
      expect(foundAssertions[1]).toBeDefined();
      expect(foundAssertions[1]?.id).toBe(ids[1]);
    });

    it('should return null for non-existent assertions', async () => {
      // Arrange
      const ids = ['non-existent-1', 'non-existent-2'];

      // Act
      const foundAssertions = await repository.findByIds(ids);

      // Assert
      expect(foundAssertions).toHaveLength(2);
      expect(foundAssertions[0]).toBeNull();
      expect(foundAssertions[1]).toBeNull();
    });

    it('should handle mixed existing and non-existent IDs', async () => {
      // Arrange
      const assertionToCreate = {
        recipient: { identity: 'user1@example.com' },
        badgeClass: 'badge-class-1',
        evidence: [{ id: 'evidence-1' }],
      } as Omit<Assertion, 'id'>;

      const createResults = await repository.createBatch([assertionToCreate]);
      const existingId = createResults[0].assertion!.id;
      const ids = [existingId, 'non-existent'];

      // Act
      const foundAssertions = await repository.findByIds(ids);

      // Assert
      expect(foundAssertions).toHaveLength(2);
      expect(foundAssertions[0]).toBeDefined();
      expect(foundAssertions[0]?.id).toBe(existingId);
      expect(foundAssertions[1]).toBeNull();
    });
  });

  describe('updateStatusBatch', () => {
    it('should update multiple assertion statuses successfully', async () => {
      // Arrange
      const assertionsToCreate = [
        {
          recipient: { identity: 'user1@example.com' },
          badgeClass: 'badge-class-1',
          evidence: [{ id: 'evidence-1' }],
        },
        {
          recipient: { identity: 'user2@example.com' },
          badgeClass: 'badge-class-1',
          evidence: [{ id: 'evidence-2' }],
        },
      ] as Omit<Assertion, 'id'>[];

      const createResults = await repository.createBatch(assertionsToCreate);
      const ids = createResults.map(r => r.assertion!.id);

      const updates = [
        { id: ids[0], status: 'revoked' as const, reason: 'Test revocation' },
        { id: ids[1], status: 'active' as const },
      ];

      // Act
      const results = await repository.updateStatusBatch(updates);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].assertion?.revoked).toBe(true);
      expect(results[0].assertion?.revocationReason).toBe('Test revocation');
      expect(results[1].success).toBe(true);
      expect(results[1].assertion?.revoked).toBe(false);
    });

    it('should handle updates for non-existent assertions', async () => {
      // Arrange
      const updates = [
        { id: 'non-existent', status: 'revoked' as const },
      ];

      // Act
      const results = await repository.updateStatusBatch(updates);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Assertion not found');
    });

    it('should handle suspended status correctly', async () => {
      // Arrange
      const assertionToCreate = {
        recipient: { identity: 'user1@example.com' },
        badgeClass: 'badge-class-1',
        evidence: [{ id: 'evidence-1' }],
      } as Omit<Assertion, 'id'>;

      const createResults = await repository.createBatch([assertionToCreate]);
      const id = createResults[0].assertion!.id;

      const updates = [
        { id, status: 'suspended' as const, reason: 'Temporary suspension' },
      ];

      // Act
      const results = await repository.updateStatusBatch(updates);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].assertion?.revoked).toBe(true);
      expect(results[0].assertion?.revocationReason).toBe('Temporary suspension');
    });
  });
});
