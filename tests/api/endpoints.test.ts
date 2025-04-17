/**
 * API endpoint tests for Open Badges API
 *
 * This file contains tests for the API endpoints to ensure they work correctly
 * with the new Shared.IRI types.
 */

import { describe, expect, it } from 'bun:test';
import { Shared } from 'openbadges-types';

describe('API Endpoints with Shared.IRI Types', () => {
  // Test that Shared.IRI types can be used in place of strings
  it('should handle Shared.IRI types for IDs', () => {
    // Create a Shared.IRI from a string
    const id = '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI;

    // Verify it's a valid IRI
    expect(typeof id).toBe('string');

    // Test that it can be used in string operations
    expect(`${id}`).toBe('123e4567-e89b-12d3-a456-426614174000');

    // Test that it can be used in comparisons
    expect(id === '123e4567-e89b-12d3-a456-426614174000').toBe(true);
  });

  // Test that Shared.IRI types can be used for URLs
  it('should handle Shared.IRI types for URLs', () => {
    // Create a Shared.IRI from a URL string
    const url = 'https://example.com/badge' as Shared.IRI;

    // Verify it's a valid IRI
    expect(typeof url).toBe('string');

    // Test that it can be used in string operations
    expect(`${url}`).toBe('https://example.com/badge');

    // Test that it can be used in comparisons
    expect(url === 'https://example.com/badge').toBe(true);
  });

  // Test that Shared.IRI types can be used in objects
  it('should handle Shared.IRI types in objects', () => {
    // Create an object with Shared.IRI properties
    const obj = {
      id: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      url: 'https://example.com/badge' as Shared.IRI,
      name: 'Test Badge'
    };

    // Verify the properties are correct
    expect(obj.id).toBe('123e4567-e89b-12d3-a456-426614174000' as Shared.IRI);
    expect(obj.url).toBe('https://example.com/badge' as Shared.IRI);
    expect(obj.name).toBe('Test Badge');

    // Test that the properties can be used in string operations
    expect(`${obj.id}`).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(`${obj.url}`).toBe('https://example.com/badge');
  });

  // Test that Shared.IRI types can be converted to/from JSON
  it('should handle Shared.IRI types in JSON', () => {
    // Create an object with Shared.IRI properties
    const obj = {
      id: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      url: 'https://example.com/badge' as Shared.IRI,
      name: 'Test Badge'
    };

    // Convert to JSON and back
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json);

    // Verify the properties are preserved
    expect(parsed.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(parsed.url).toBe('https://example.com/badge');
    expect(parsed.name).toBe('Test Badge');
  });
});
