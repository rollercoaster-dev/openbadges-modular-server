# OB3 Upgrade Task Plan

## 1. Executive Summary

This document outlines the critical tasks required to bring the `openbadges-modular-server` project into alignment with its stated goals for Open Badges 3.0 compliance and a secure self-signing feature. The current implementation has completely diverged from the documented architecture, opting for a custom-built server instead of the planned `badge-engine`. This has introduced significant security vulnerabilities and architectural debt that must be addressed.

The most critical issue is the client-side management of cryptographic keys for the self-signing feature. This exposes private keys to potential theft and compromises the integrity of the entire system. Additionally, the data model does not robustly support the complexities of the Open Badges 3.0 specification, and the project's documentation is now dangerously out of sync with the actual codebase.

This plan provides a prioritized, actionable roadmap for remediation. Addressing these issues is essential for the project's success and security.

## 2. Critical Blockers (Priority: Critical)

### Task: Re-architect the Self-Signing Feature

*   **Description:** The current implementation requires the client to generate and manage the private key, which is a critical security vulnerability. The key generation, storage, and usage must be moved to the server to protect the integrity of the badges.
*   **Affected Files:**
    *   `src/api/validation/issuer.schemas.ts`
    *   `src/api/controllers/issuer.controller.ts`
    *   `src/domains/issuer/issuer.entity.ts`
*   **Recommendation:**
    1.  Remove the `publicKey` from the `CreateIssuerSchema`.
    2.  Implement a new endpoint or modify the existing issuer creation endpoint to generate a key pair on the server.
    3.  The server should store the private key securely and return only the public key to the client.

## 3. Security Vulnerabilities (Prioritized)

### Task: Implement Secure Cryptographic Key Management (Priority: High)

*   **Description:** Once key generation is moved to the server, the private keys must be stored and managed securely. This task will involve implementing a secure storage solution, such as a protected vault or a hardware security module (HSM), to prevent unauthorized access.
*   **Affected Files:** This will likely require a new module for key management, e.g., `src/infrastructure/security/key-vault.service.ts`.
*   **Recommendation:**
    1.  Evaluate and select a secure storage solution (e.g., HashiCorp Vault, AWS KMS).
    2.  Implement a service to manage the lifecycle of cryptographic keys (generation, storage, rotation, and revocation).
    3.  Ensure that access to the key management service is tightly controlled and audited.

## 4. OB 3.0 Compliance Gaps (Prioritized)

### Task: Refactor the Data Model to Align with OB 3.0 (Priority: Medium)

*   **Description:** The current data model stores complex OB 3.0 properties (like `criteria`, `evidence`, and `recipient`) as serialized JSON in `text` fields. This is not a robust or scalable solution. The data model should be refactored to use separate, related tables for these nested objects to ensure data integrity and query performance.
*   **Affected Files:** `src/infrastructure/database/modules/sqlite/schema.ts`
*   **Recommendation:**
    1.  Analyze the Open Badges 3.0 specification to identify all complex properties.
    2.  Create new tables for each of these properties (e.g., `criteria`, `evidence`, `alignment`).
    3.  Update the Drizzle schema and all related repositories and services to use the new, normalized data model.

## 5. Architectural & Code Quality Debt (Prioritized)

### Task: Improve Data Validation for Security (Priority: Low)

*   **Description:** The `publicKey` field in the `CreateIssuerSchema` is not properly validated, accepting any object. The schema should be updated to enforce a specific structure for the public key (e.g., JWK format) to prevent injection of malicious data.
*   **Affected Files:** `src/api/validation/issuer.schemas.ts`
*   **Recommendation:**
    1.  Define a Zod schema for the expected public key format (e.g., JWK).
    2.  Update the `IssuerBaseSchema` to use this new schema for the `publicKey` field.