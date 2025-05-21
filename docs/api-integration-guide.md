# API Integration Guide

This guide provides practical instructions for integrating with the Open Badges Modular Server API, including authentication, endpoints, and code examples.

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Core Endpoints](#core-endpoints)
4. [Integration Examples](#integration-examples)
5. [Common Operations](#common-operations)
6. [Error Handling](#error-handling)

## API Overview

The Open Badges Modular Server provides a RESTful API for managing Open Badges. The API follows the Open Badges 2.0 specification with a planned roadmap for Open Badges 3.0.

### API Versions

- `/v2/...` - Open Badges 2.0 endpoints
- `/v3/...` - Open Badges 3.0 endpoints (in development)

### Base URL

The base URL for all API requests is the server's domain, for example:

```
https://badges.example.com
```

### Response Format

All API responses are in JSON format and follow this structure:

```json
{
  "status": "success",
  "data": { ... }
}
```

Or for errors:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Authentication

The API supports multiple authentication methods:

### 1. API Key Authentication

Use an API key for service-to-service integration:

```
Authorization: ApiKey your-api-key
```

or

```
X-API-Key: your-api-key
```

### 2. JWT Authentication

Use a JWT token for user authentication:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Basic Authentication

Use HTTP Basic Authentication for simple integrations:

```
Authorization: Basic base64(username:password)
```

### Example: Authenticating with an API Key

```bash
curl -X GET https://badges.example.com/v2/issuers \
  -H "Authorization: ApiKey your-api-key"
```

## Core Endpoints

### Issuers

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v2/issuers` | GET | List all issuers |
| `/v2/issuers` | POST | Create a new issuer |
| `/v2/issuers/{issuerId}` | GET | Get issuer details |
| `/v2/issuers/{issuerId}` | PUT | Update an issuer |
| `/v2/issuers/{issuerId}` | DELETE | Delete an issuer |

### Badge Classes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v2/issuers/{issuerId}/badge-classes` | GET | List badge classes for an issuer |
| `/v2/issuers/{issuerId}/badge-classes` | POST | Create a new badge class |
| `/v2/badge-classes/{badgeClassId}` | GET | Get badge class details |
| `/v2/badge-classes/{badgeClassId}` | PUT | Update a badge class |
| `/v2/badge-classes/{badgeClassId}` | DELETE | Delete a badge class |

### Assertions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v2/badge-classes/{badgeClassId}/assertions` | GET | List assertions for a badge class |
| `/v2/badge-classes/{badgeClassId}/assertions` | POST | Issue a new assertion |
| `/v2/assertions/{assertionId}` | GET | Get assertion details |
| `/v2/assertions/{assertionId}` | PUT | Update an assertion |
| `/v2/assertions/{assertionId}` | DELETE | Revoke an assertion |

### Public Endpoints

These endpoints are accessible without authentication:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v2/issuers/{issuerId}/public` | GET | Get public issuer details |
| `/v2/badge-classes/{badgeClassId}/public` | GET | Get public badge class details |
| `/v2/assertions/{assertionId}/public` | GET | Get public assertion details |
| `/health` | GET | Check API health |

## Integration Examples

### JavaScript/TypeScript Example

```typescript
// Using fetch API
async function getIssuers(apiKey: string): Promise<any> {
  const response = await fetch('https://badges.example.com/v2/issuers', {
    headers: {
      'Authorization': `ApiKey ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

// Create an issuer
async function createIssuer(apiKey: string, issuerData: any): Promise<any> {
  const response = await fetch('https://badges.example.com/v2/issuers', {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issuerData)
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}
```

### Python Example

```python
import requests

BASE_URL = 'https://badges.example.com'

def get_issuers(api_key):
    headers = {
        'Authorization': f'ApiKey {api_key}',
        'Content-Type': 'application/json'
    }
    response = requests.get(f'{BASE_URL}/v2/issuers', headers=headers)
    response.raise_for_status()
    return response.json()

def create_issuer(api_key, issuer_data):
    headers = {
        'Authorization': f'ApiKey {api_key}',
        'Content-Type': 'application/json'
    }
    response = requests.post(
        f'{BASE_URL}/v2/issuers',
        headers=headers,
        json=issuer_data
    )
    response.raise_for_status()
    return response.json()
```

### cURL Examples

```bash
# List all issuers
curl -X GET https://badges.example.com/v2/issuers \
  -H "Authorization: ApiKey your-api-key"

# Create a new issuer
curl -X POST https://badges.example.com/v2/issuers \
  -H "Authorization: ApiKey your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Organization",
    "url": "https://example.org",
    "email": "badges@example.org",
    "description": "An example badge issuer"
  }'
```

## Common Operations

### Creating an Issuer

```json
// POST /v2/issuers
{
  "name": "Example Organization",
  "url": "https://example.org",
  "email": "badges@example.org",
  "description": "An example badge issuer",
  "image": "https://example.org/logo.png"
}
```

### Creating a Badge Class

```json
// POST /v2/issuers/{issuerId}/badge-classes
{
  "name": "Example Badge",
  "description": "This badge is awarded for completing the example course",
  "image": "https://example.org/badges/example.png",
  "criteria": {
    "narrative": "Complete all modules of the example course with a score of 80% or higher"
  },
  "tags": ["example", "course"]
}
```

### Issuing an Assertion

```json
// POST /v2/badge-classes/{badgeClassId}/assertions
{
  "recipient": {
    "identity": "sha256$c7ef86405ba71b85acd8e2e95166c4b111448089f2e1599f42fe1bba46e865c5",
    "type": "email",
    "hashed": true,
    "salt": "deadsea"
  },
  "issuedOn": "2023-01-15T12:00:00Z",
  "evidence": [
    {
      "type": ["Evidence"],
      "id": "https://example.org/evidence/1234",
      "narrative": "Completed the course with a score of 95%"
    }
  ]
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include detailed information:

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The 'name' field is required",
    "details": {
      "field": "name",
      "issue": "required"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: No authentication provided
- `INVALID_CREDENTIALS`: Invalid API key or JWT
- `PERMISSION_DENIED`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `VALIDATION_ERROR`: Request validation failed
- `INTERNAL_ERROR`: Server error

### Handling Rate Limiting

The API implements rate limiting to prevent abuse. Rate limit information is included in the response headers:

- `X-RateLimit-Limit`: Maximum requests per time window
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

When rate limited, the API returns a `429 Too Many Requests` status code.

## Additional Resources

- [API Documentation](./api-documentation.md): Comprehensive API documentation
- [Authentication Guide](./authentication-integration-guide.md): Detailed authentication information
- [Open Badges 2.0 Specification](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html): Official Open Badges 2.0 specification
