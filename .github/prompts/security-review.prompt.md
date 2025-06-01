# Security Review Pattern

Your goal is to perform a comprehensive security review of code following the established security practices in this OpenBadges modular server.

## Security Checklist

### Authentication & Authorization
- [ ] All endpoints are protected by proper authentication
- [ ] Authorization checks are implemented for user permissions
- [ ] API keys are properly validated and secured
- [ ] JWT tokens are properly signed and validated
- [ ] Session management is secure
- [ ] Password complexity requirements are enforced
- [ ] Email validation uses proper regex patterns
- [ ] Username validation includes reserved name checks

### Input Validation & Sanitization
- [ ] All user inputs are validated using Zod schemas
- [ ] SQL injection prevention through parameterized queries
- [ ] XSS prevention through proper output encoding
- [ ] Path traversal prevention in file operations
- [ ] File upload validation and restrictions
- [ ] JSON parsing limits and validation
- [ ] URL validation for external resources

### Data Protection
- [ ] Sensitive data is properly encrypted at rest
- [ ] Passwords are hashed using secure algorithms
- [ ] API keys and secrets are not hard-coded
- [ ] Sensitive data is sanitized in logs (use '[REDACTED]')
- [ ] Database connections use secure configurations
- [ ] Environment variables are properly secured

### Open Badges Security
- [ ] DID/IRI validation for `recipientId` fields
- [ ] Badge integrity and authenticity verification
- [ ] Proper cryptographic signatures for badges
- [ ] Secure badge issuance workflows
- [ ] Protection against badge forgery

### Cryptographic Security
- [ ] Use `crypto.randomUUID()` instead of `Math.random()`
- [ ] Proper random number generation for security tokens
- [ ] Secure key generation and storage
- [ ] Certificate validation for external communications
- [ ] Proper entropy for cryptographic operations

### Error Handling & Information Disclosure
- [ ] Error messages don't reveal sensitive information
- [ ] Stack traces are not exposed in production
- [ ] Proper error logging without sensitive data
- [ ] Consistent error response formats
- [ ] Rate limiting to prevent abuse

### Network Security
- [ ] HTTPS enforcement for all communications
- [ ] Proper CORS configuration
- [ ] Security headers implementation (CSP, HSTS, etc.)
- [ ] Protection against CSRF attacks
- [ ] Secure cookie configuration

### Database Security
- [ ] Database connections use least privilege principles
- [ ] Proper transaction isolation levels
- [ ] Protection against timing attacks
- [ ] Secure database configuration
- [ ] Regular security updates

### Dependency Security
- [ ] Dependencies are regularly updated
- [ ] Known vulnerabilities are addressed
- [ ] Security advisories are monitored
- [ ] Dependency integrity verification

### Logging & Monitoring
- [ ] Security events are properly logged
- [ ] Audit trails for sensitive operations
- [ ] Monitoring for suspicious activities
- [ ] Log retention and protection policies

### Example Security Issues to Look For
```typescript
// ❌ Bad: Hard-coded credentials
const apiKey = "abc123-secret-key";

// ✅ Good: Environment variable
const apiKey = process.env.API_KEY;

// ❌ Bad: Insecure random generation
const token = Math.random().toString(36);

// ✅ Good: Cryptographically secure
const token = crypto.randomUUID();

// ❌ Bad: Sensitive data in logs
logger.error('Login failed', { password: userPassword });

// ✅ Good: Sanitized logging
logger.error('Login failed', { password: '[REDACTED]' });
```

### Security Testing
- [ ] Authentication bypass attempts
- [ ] Authorization escalation tests
- [ ] Input validation boundary testing
- [ ] SQL injection testing
- [ ] XSS vulnerability testing
- [ ] CSRF protection testing

Reference the project's security practices and existing security implementations.
