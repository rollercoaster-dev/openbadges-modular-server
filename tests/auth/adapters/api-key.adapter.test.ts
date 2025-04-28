/**
 * API Key Adapter Tests
 * 
 * This file contains tests for the API Key authentication adapter.
 */

import { describe, test, expect, mock } from 'bun:test';
import { ApiKeyAdapter } from '../../../src/auth/adapters/api-key.adapter';
import { ApiKeyRepository } from '../../../src/domains/auth/apiKey.repository';
import { ApiKey } from '../../../src/domains/auth/apiKey.entity';
import { Shared } from 'openbadges-types';

describe('API Key Adapter', () => {
  test('should authenticate with a valid API key', async () => {
    // Create a mock API key
    const apiKey = ApiKey.create({
      name: 'Test API Key',
      userId: 'test-user',
      description: 'Test API Key description',
      permissions: {
        roles: ['user'],
        permissions: ['read:badges']
      }
    });
    
    // Create a mock repository
    const mockRepository: Partial<ApiKeyRepository> = {
      findByKey: mock(async (key: string) => {
        if (key === 'valid-api-key') {
          return apiKey;
        }
        return null;
      }),
      updateLastUsed: mock(async (id: Shared.IRI) => {
        return apiKey;
      })
    };
    
    // Create the adapter with static config
    const adapter = new ApiKeyAdapter({
      providerName: 'api-key',
      config: {
        keys: {
          'static-api-key': {
            userId: 'static-user',
            description: 'Static API Key',
            claims: { roles: ['static'] }
          }
        }
      }
    });
    
    // Set the repository
    (adapter as any).apiKeyRepository = mockRepository;
    
    // Create a request with a valid API key
    const request = new Request('http://localhost/api/protected', {
      headers: {
        'X-API-Key': 'valid-api-key'
      }
    });
    
    // Authenticate the request
    const result = await adapter.authenticate(request);
    
    // Check the result
    expect(result.isAuthenticated).toBe(true);
    expect(result.userId).toBe('test-user');
    expect(result.provider).toBe('api-key');
    expect(result.claims).toEqual({
      roles: ['user'],
      permissions: ['read:badges'],
      apiKeyId: apiKey.id,
      apiKeyName: apiKey.name,
      apiKeyDescription: apiKey.description
    });
    
    // Check that the repository methods were called
    expect(mockRepository.findByKey).toHaveBeenCalledWith('valid-api-key');
    expect(mockRepository.updateLastUsed).toHaveBeenCalledWith(apiKey.id);
  });
  
  test('should authenticate with a static API key', async () => {
    // Create the adapter with static config
    const adapter = new ApiKeyAdapter({
      providerName: 'api-key',
      config: {
        keys: {
          'static-api-key': {
            userId: 'static-user',
            description: 'Static API Key',
            claims: { roles: ['static'] }
          }
        }
      }
    });
    
    // Create a request with a static API key
    const request = new Request('http://localhost/api/protected', {
      headers: {
        'X-API-Key': 'static-api-key'
      }
    });
    
    // Authenticate the request
    const result = await adapter.authenticate(request);
    
    // Check the result
    expect(result.isAuthenticated).toBe(true);
    expect(result.userId).toBe('static-user');
    expect(result.provider).toBe('api-key');
    expect(result.claims).toEqual({
      roles: ['static'],
      apiKeyDescription: 'Static API Key',
      source: 'static-config'
    });
  });
  
  test('should fail authentication with an invalid API key', async () => {
    // Create a mock repository
    const mockRepository: Partial<ApiKeyRepository> = {
      findByKey: mock(async (key: string) => {
        return null;
      })
    };
    
    // Create the adapter with static config
    const adapter = new ApiKeyAdapter({
      providerName: 'api-key',
      config: {
        keys: {}
      }
    });
    
    // Set the repository
    (adapter as any).apiKeyRepository = mockRepository;
    
    // Create a request with an invalid API key
    const request = new Request('http://localhost/api/protected', {
      headers: {
        'X-API-Key': 'invalid-api-key'
      }
    });
    
    // Authenticate the request
    const result = await adapter.authenticate(request);
    
    // Check the result
    expect(result.isAuthenticated).toBe(false);
    expect(result.error).toBe('Invalid API key');
    expect(result.provider).toBe('api-key');
    
    // Check that the repository method was called
    expect(mockRepository.findByKey).toHaveBeenCalledWith('invalid-api-key');
  });
  
  test('should fail authentication with a revoked API key', async () => {
    // Create a mock API key
    const apiKey = ApiKey.create({
      name: 'Revoked API Key',
      userId: 'test-user'
    });
    
    // Revoke the API key
    apiKey.revoke();
    
    // Create a mock repository
    const mockRepository: Partial<ApiKeyRepository> = {
      findByKey: mock(async (key: string) => {
        if (key === 'revoked-api-key') {
          return apiKey;
        }
        return null;
      })
    };
    
    // Create the adapter with static config
    const adapter = new ApiKeyAdapter({
      providerName: 'api-key',
      config: {
        keys: {}
      }
    });
    
    // Set the repository
    (adapter as any).apiKeyRepository = mockRepository;
    
    // Create a request with a revoked API key
    const request = new Request('http://localhost/api/protected', {
      headers: {
        'X-API-Key': 'revoked-api-key'
      }
    });
    
    // Authenticate the request
    const result = await adapter.authenticate(request);
    
    // Check the result
    expect(result.isAuthenticated).toBe(false);
    expect(result.error).toBe('API key has been revoked');
    expect(result.provider).toBe('api-key');
    
    // Check that the repository method was called
    expect(mockRepository.findByKey).toHaveBeenCalledWith('revoked-api-key');
  });
  
  test('should fail authentication with no API key', async () => {
    // Create the adapter with static config
    const adapter = new ApiKeyAdapter({
      providerName: 'api-key',
      config: {
        keys: {}
      }
    });
    
    // Create a request with no API key
    const request = new Request('http://localhost/api/protected');
    
    // Authenticate the request
    const result = await adapter.authenticate(request);
    
    // Check the result
    expect(result.isAuthenticated).toBe(false);
    expect(result.error).toBe('No API key provided');
    expect(result.provider).toBe('api-key');
  });
});
