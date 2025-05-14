# OpenBadges Modular Server – Open Badges Compliance Review

## Overview
The **OpenBadges Modular Server (BadgeForge)** is an API-only issuer that currently offers solid Open Badges **2.0 “hosted”** support and early, partial scaffolding for **Open Badges 3.0**.  
This document reviews how well each lifecycle element (issuer → badge class → assertion → verify/revoke) aligns with the official specs, highlights deviations or omissions, and suggests improvements—especially around OB 3.0 and signed/VC badges. Finally, it looks at the end‑to‑end (E2E) test suite and recommends extra coverage.

---

## 1 · Issuer Metadata  
**Spec needs** (OB 2.0): `@context`, `id`, `type:"Issuer"|"Profile"`, `name`; plus optional `url`, `email`, `description`, `image`, `publicKey`, `revocationList`.  

**Server status**
- `POST /v2/issuers` + `GET /v2/issuers/:id` return valid OB2 issuer JSON (all required fields, correct context/type).  
- `id` is a resolvable HTTPS URL → ✅ good for hosted verification.  
- **Missing optional keys** for signed‑badge use‑case: `publicKey`, `revocationList`.  

**Action items**
| Priority | Task |
|----------|------|
| ▲ | Expose issuer public key (JWKS or DID) and add `verification` block—needed once signed badges land. |
| ○ | Optional: publish revocation list JSON if you adopt signed badges. |

---

## 2 · BadgeClass Definition  
**Spec needs**: `@context`, `id`, `type:"BadgeClass"`, `name`, `description`, `image`, `criteria`, and `issuer` reference.  

**Server status**
- CRUD at `/v2/badge-classes`. Output meets schema (all required props, issuer link as IRI).  
- Validation exists but **add a negative test** ensuring required fields can’t be omitted.  
- Optional OB2 fields (`alignment`, `tags`) not yet surfaced—fine for compliance, note for enhancement.

---

## 3 · Assertion (Badge Issuance)  
**Spec needs**: `@context`, `id`, `type:"Assertion"`, `recipient`, `badge` (IRI), `issuedOn`, `verification`, optional `evidence`, `expires`, etc.  

**Server status**
- `/v2/assertions` issues well‑formed hosted assertions; `verification.type:"hosted"`.  
- `id` is the public URL → meets hosted‑badge rule.  
- Revocation: `POST /v2/assertions/:id/revoke` flips a DB flag **but JSON still fetches without a trace** → 3rd‑party verifiers might miss the revocation.  

**Action items**
| Priority | Task |
|----------|------|
| ▲ | When revoked, either 410/404 the assertion URL **or** include `"revoked":true` flag. |
| ○ | Add support for `evidence` and `narrative` in API & tests. |
| ○ | Encourage recipient hashing (`hashed:true`) via docs/SDK helper. |

---

## 4 · Verification Mechanism  
### 2.0 Hosted flow  
Works: fetch assertion JSON → trust HTTPS domain. `GET /v2/assertions/:id/verify` is a helpful extra channel.

### Missing 2.0 **SignedBadge** flow  
No JWS/JSON‑LD proofs; no issuer key published. Not required for OB 2 compliance, but valuable for offline portability.

### 3.0 Verifiable‑Credential flow  
`/v3/**` endpoints output objects with the OB 3 context but **do not**:  
* wrap in VC envelope (`type:["VerifiableCredential","OpenBadgeCredential"]`),  
* generate `proof`, **or**  
* expose `credentialStatus`.  

---

## 5 · Display & Interop  
- BadgeClass supplies title, description, image, criteria → any viewer can display.  
- Hosted badges import fine into Badgr/Backpacks by URL.  
- No baked‑image endpoint; not mandatory—can be external CLI.

---

## 6 · E2E Test Coverage  
Current happy‑path tests: issuer → badge → assertion → verify → revoke.  

**Add edge‑case tests**  
1. Creating BadgeClass missing required field → expect 400.  
2. Assertion with invalid badgeClassId → 404.  
3. Recipient hash vs plain email variations.  
4. Expired assertion (`expires` in past) fails verify.  
5. Delete issuer with active badges → expect constraint error.

---

## 7 · OB 3.0 Gap Summary  
| Needed for full OB 3 | Status |
|----------------------|--------|
| VC wrapper & proof | ❌ |
| Issuer DID/JWKS | ❌ |
| StatusList2021 revocation | ❌ |
| `.well-known/openbadges` ServiceDescription + OAuth flows | ❌ |
| Achievement → `credentialSubject.achievement` mapping | ❌ |

---

## 8 · Recommendations Roadmap
1. **Short term (OB 2 polish)**  
   * Add revocation visibility & signed‑badge option (JWS).  
   * Publish issuer publicKey & optional revocationList.  
2. **Mid term (OB 3 core)**  
   * VC envelope + JWS proof, StatusList2021, DID:web.  
3. **Long term (BadgeConnect/CLR)**  
   * OAuth, ServiceDescription, paged credential list endpoints.

---

## Conclusion  
For an MVP that only needs **OB 2.0 hosted badges**, this server is production‑ready with minor tweaks (chiefly revocation discoverability).  
Full spec coverage—Signed OB2 and VC‑based OB3—will require additional crypto plumbing, status lists, and OAuth endpoints, but the modular codebase and existing type definitions make that an achievable phase‑2/3 roadmap.

---

## Sources  
* IMS Open Badges 2.0 Specification  
* IMS Open Badges 3.0 Candidate Draft  
* openbadges‑types TypeScript library  
* Repository `README.md`, E2E test suite
