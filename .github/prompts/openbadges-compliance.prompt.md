# Open Badges 3.0 Compliance Review

Your goal is to ensure code changes maintain compliance with the Open Badges 3.0 specification in this OpenBadges modular server.

## Open Badges 3.0 Requirements

### Core Badge Components
- [ ] **Badge Class**: Properly defined with required fields
- [ ] **Assertion**: Links badge class to recipient
- [ ] **Issuer Profile**: Valid issuer information
- [ ] **Criteria**: Required field describing how badge is earned
- [ ] **Evidence**: Optional supporting evidence for badge

### Required Fields Validation
- [ ] `criteria` field is required (not optional) in badge class schemas
- [ ] `recipientId` must be a valid DID/IRI format
- [ ] Reject empty strings or 'unknown' values for `recipientId`
- [ ] All required Open Badges fields are present and validated

### DID/IRI Format Validation
```typescript
// ✅ Valid DID formats
"did:example:123456789abcdefghi"
"did:web:example.com"
"did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"

// ✅ Valid IRI formats
"https://example.com/users/alice"
"mailto:alice@example.com"

// ❌ Invalid formats (should be rejected)
""
"unknown"
"alice"
"123"
```

### Badge Verification
- [ ] Cryptographic signatures are properly implemented
- [ ] Badge authenticity can be verified
- [ ] Issuer verification is working correctly
- [ ] Badge revocation status can be checked

### JSON-LD Context
- [ ] Proper JSON-LD context for Open Badges 3.0
- [ ] Correct vocabulary and terms usage
- [ ] Valid linked data structure

### Issuer Profile Requirements
- [ ] Issuer has valid identifier (DID/IRI)
- [ ] Issuer name and description are present
- [ ] Issuer contact information is valid
- [ ] Issuer verification methods are defined

### Badge Class Requirements
- [ ] Unique identifier for badge class
- [ ] Clear name and description
- [ ] Criteria for earning the badge
- [ ] Optional image and tags
- [ ] Proper alignment to standards/frameworks

### Assertion Requirements
- [ ] Links to valid badge class
- [ ] Valid recipient identifier (DID/IRI)
- [ ] Issuance date is present
- [ ] Optional expiration date handling
- [ ] Evidence links if provided

### API Compliance
- [ ] Badge issuance endpoints follow specification
- [ ] Badge verification endpoints work correctly
- [ ] Proper HTTP status codes for badge operations
- [ ] Content-Type headers for JSON-LD responses

### Example Validation Patterns
```typescript
// Badge Class Schema
const badgeClassSchema = z.object({
  id: z.string().url(),
  name: z.string().min(1),
  description: z.string().min(1),
  criteria: z.string().min(1), // Required, not optional
  image: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

// Recipient ID Validation
const recipientIdSchema = z.string()
  .refine((val) => {
    // Must be valid DID or IRI
    return val.startsWith('did:') || 
           val.startsWith('http://') || 
           val.startsWith('https://') ||
           val.startsWith('mailto:');
  }, {
    message: 'recipientId must be a valid DID or IRI format'
  })
  .refine((val) => {
    // Reject empty or placeholder values
    return val !== '' && val !== 'unknown';
  }, {
    message: 'recipientId cannot be empty or unknown'
  });
```

### Testing Compliance
- [ ] Test badge issuance workflow end-to-end
- [ ] Validate badge verification process
- [ ] Test with various DID/IRI formats
- [ ] Verify JSON-LD structure and context
- [ ] Test error handling for invalid data

### Documentation
- [ ] API documentation reflects Open Badges 3.0 compliance
- [ ] Examples show proper badge structure
- [ ] Validation rules are documented
- [ ] Migration guides for specification updates

### External Validation
- [ ] Badges validate against Open Badges specification
- [ ] Compatible with Open Badges verification tools
- [ ] Interoperable with other Open Badges platforms

Reference the Open Badges 3.0 specification and existing compliance implementations in the codebase.
