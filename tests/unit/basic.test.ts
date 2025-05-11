/**
 * Basic unit test to ensure the unit test directory is not empty
 */
import { describe, it, expect } from 'bun:test';

describe('Basic Unit Test', () => {
  it('should pass a simple assertion', () => {
    expect(true).toBe(true);
  });

  it('should correctly add two numbers', () => {
    expect(1 + 1).toBe(2);
  });
});
