# OBMS OB3 Roadmap

This document outlines the roadmap for Open Badges, detailing each phase along with its goals, key tasks, and success criteria.

## Roadmap Overview

Below is a summary table that provides an at-a-glance view of the roadmap:

| **Phase**                      | **Goal**                                               | **Key Tasks**                                                                                                                                                                         | **Success Criteria**                                                                    |
|--------------------------------|--------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| **0. Baseline**                | Freeze current OB 2.0 "hosted" implementation          | - Tag v0.9 release<br>- Enable feature flags for any new functionality to keep MVP users stable                                                                                         | Tagged release deployed & documentation updated                                         |
| **1. OB 2.0 feature‑complete**   | Offer every optional OB 2.0 capability                 | - *Signed Assertions*:<br>&nbsp;&nbsp;&bull; Generate JWS (RS256) for each assertion<br>&nbsp;&nbsp;&bull; Expose issuer publicKey in profile                                         | Upgrade to full Open Badges 2.0 and 3.0 compliance                                        |
| **2. RevocationList**          |                                                        | - Publish `/revocations/<issuer>.json` (using either a spec bitstring or array)<br>- Add revocationList link to issuer profile                                                          | Validator passes signed & hosted paths; revoked badge correctly removed from display    |
| **3. Evidence & Alignment**      |                                                        | - Accept evidence objects and alignment arrays on assertions/badge‑class                                                                                                               |                                                                                         |
| **4. Baked Images Helper**     |                                                        | - Develop CLI/endpoint to bake PNG/SVG images with assertion URL                                                                                                                       |                                                                                         |
| **5. OB 3.0 core VC**            | Wrap every assertion in a Verifiable Credential         | - Add VC envelope (with type, issuer, credentialSubject, issuanceDate)<br>- Move badge → embed in credentialSubject.achievement<br>- Generate proof (starting with JWS)<br>- Create new `/v3/assertions` returning VC‑JSON | VC meets W3C VC JSON‑Schema and IMS OB 3 test vectors                                      |
| **6. Issuer Identity & Keys**   | Make OB 3 proofs verifiable offline                     | - Publish JWKS at `/.well-known/jwks.json` or adopt DID:web methodology<br>- Rotate keys via migration script<br>- Add verificationMethod DID URL to issuer object                  | did-resolver and vc‑verify succeed with a sample badge                                    |
| **7. Status & Revocation for OB 3** | VC‑native revocation                                    | - Implement StatusList2021 (bitstring, 16k entries)<br>- Add credentialStatus to every VC<br>- Set up a nightly job to rebuild lists                                                    | Revoked VC fails verification without API intervention                                   |
| **8. OB 3 Service Description & OAuth** | Full CLR / BadgeConnect 3.0 API                        | - Publish service JSON at `/.well-known/openbadges`<br>- Implement OAuth 2 client‑credentials flow<br>- Add GET `/credentials` with pagination and filters                          | Accreditor’s reference client can import and verify credentials end‑to‑end                |
| **9. Compliance & Interop Tests**  | Continuous assurance                                   | - Integrate the OpenBadges Conformance Suite in CI<br>- Run vc‑http‑api test harness for proofs/status<br>- Perform fuzz tests for schema variants                                     | CI remains green on every merge                                                           |
| **10. Docs & Developer UX**      | Smooth adoption                                        | - Split documentation: "Using OB 2" vs "Using OB 3"<br>- Provide code samples in strict TypeScript<br>- Create a migration guide from `/v2` to `/v3`                                      | New integrators can issue and verify both versions in under 30 minutes                      |

## Timeline

- **Month 1:** Complete Phase 1  
- **Month 2–3:** Execute Phases 2 & 3 in parallel (note: proofs depend on keys)  
- **Month 4:** Finalize Phase 4  
- **Month 5:** Proceed with Phase 5 and interop bake-offs  
- **Month 6:** Harden tests and publish v1.0  

---

**Tip:** Keep `/v2/**` endpoints stable throughout the roadmap and release `/v3/**` endpoints behind an alpha header until Phase 4 is complete.
