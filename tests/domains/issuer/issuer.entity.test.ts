/**
 * Unit tests for the Issuer entity
 * 
 * This file contains tests for the Issuer domain entity to ensure
 * it behaves correctly according to the Open Badges 3.0 specification.
 */

import { describe, expect, it } from 'bun:test';
import { Issuer } from '../../../src/domains/issuer/issuer.entity';

describe('Issuer Entity', () => {
  // Test data
  const validIssuerData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Example University',
    url: 'https://example.edu',
    email: 'badges@example.edu',
    description: 'A leading institution in online education',
    image: 'https://example.edu/logo.png'
  };

  it('should create a valid issuer', () => {
    const issuer = Issuer.create(validIssuerData);
    
    expect(issuer).toBeDefined();
    expect(issuer.id).toBe(validIssuerData.id);
    expect(issuer.name).toBe(validIssuerData.name);
    expect(issuer.url).toBe(validIssuerData.url);
    expect(issuer.email).toBe(validIssuerData.email);
    expect(issuer.description).toBe(validIssuerData.description);
    expect(issuer.image).toBe(validIssuerData.image);
  });

  it('should create an issuer with only required fields', () => {
    const minimalIssuerData = {
      name: 'Minimal Issuer',
      url: 'https://minimal.org'
    };
    
    const issuer = Issuer.create(minimalIssuerData);
    
    expect(issuer).toBeDefined();
    expect(issuer.name).toBe(minimalIssuerData.name);
    expect(issuer.url).toBe(minimalIssuerData.url);
    expect(issuer.email).toBeUndefined();
    expect(issuer.description).toBeUndefined();
    expect(issuer.image).toBeUndefined();
  });

  it('should handle additional properties', () => {
    const issuerWithAdditionalProps = {
      ...validIssuerData,
      customField1: 'Custom Value 1',
      customField2: 'Custom Value 2'
    };
    
    const issuer = Issuer.create(issuerWithAdditionalProps);
    
    expect(issuer).toBeDefined();
    expect(issuer.getProperty('customField1')).toBe('Custom Value 1');
    expect(issuer.getProperty('customField2')).toBe('Custom Value 2');
  });

  it('should convert to a plain object', () => {
    const issuer = Issuer.create(validIssuerData);
    const obj = issuer.toObject();
    
    expect(obj).toBeDefined();
    expect(obj.id).toBe(validIssuerData.id);
    expect(obj.name).toBe(validIssuerData.name);
    expect(obj.url).toBe(validIssuerData.url);
    expect(obj.email).toBe(validIssuerData.email);
    expect(obj.description).toBe(validIssuerData.description);
    expect(obj.image).toBe(validIssuerData.image);
  });

  it('should convert to JSON-LD format', () => {
    const issuer = Issuer.create(validIssuerData);
    const jsonLd = issuer.toJsonLd();
    
    expect(jsonLd).toBeDefined();
    expect(jsonLd['@context']).toBe('https://w3id.org/openbadges/v3');
    expect(jsonLd.type).toBe('Profile');
    expect(jsonLd.id).toBe(validIssuerData.id);
    expect(jsonLd.name).toBe(validIssuerData.name);
    expect(jsonLd.url).toBe(validIssuerData.url);
    expect(jsonLd.email).toBe(validIssuerData.email);
    expect(jsonLd.description).toBe(validIssuerData.description);
    expect(jsonLd.image).toBe(validIssuerData.image);
  });

  it('should get property values', () => {
    const issuer = Issuer.create(validIssuerData);
    
    expect(issuer.getProperty('id')).toBe(validIssuerData.id);
    expect(issuer.getProperty('name')).toBe(validIssuerData.name);
    expect(issuer.getProperty('url')).toBe(validIssuerData.url);
    expect(issuer.getProperty('email')).toBe(validIssuerData.email);
    expect(issuer.getProperty('description')).toBe(validIssuerData.description);
    expect(issuer.getProperty('image')).toBe(validIssuerData.image);
    expect(issuer.getProperty('nonExistentProperty')).toBeUndefined();
  });
});
