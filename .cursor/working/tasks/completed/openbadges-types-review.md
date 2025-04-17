# Task: Review All Usages of openbadges-types in Modular Server

## Goal
Systematically review all usages of `openbadges-types`, `Shared`, `OB2`, and `OB3` types in the codebase. Document any inconsistencies, spec mismatches, or areas for improvement. Suggest concrete next steps for each area.

---

## 1. Usages of `openbadges-types`, `Shared`, `OB2`, and `OB3` (as of current grep)

### a. Domain Entities
- **src/domains/issuer/issuer.entity.ts**
  - `import { OB2, OB3, Shared } from 'openbadges-types';`
  - `export class Issuer implements Partial<OB2.Profile>, Partial<OB3.Issuer>`
  - `id: Shared.IRI;`
  - `url: Shared.IRI;`
  - `image?: Shared.IRI | Shared.OB3ImageObject;`
- **src/domains/badgeClass/badgeClass.entity.ts**
  - `import { OB2, OB3 } from 'openbadges-types';`
  - `export class BadgeClass implements Partial<OB2.BadgeClass>, Partial<OB3.Achievement>`
  - `criteria?: OB2.Criteria | OB3.Criteria;`
  - `alignment?: OB2.AlignmentObject[] | OB3.Alignment[];`
  - `image?: string;` (not using Shared types)
- **src/domains/assertion/assertion.entity.ts**
  - `import { OB2, OB3 } from 'openbadges-types';`
  - `export class Assertion implements Partial<OB2.Assertion>, Partial<OB3.VerifiableCredential>`
  - `evidence?: OB2.Evidence[] | OB3.Evidence[];`
  - `id: string;` (not using Shared types)

### b. Database Interfaces
- **src/infrastructure/database/interfaces/database.interface.ts**
  - `import { Issuer, BadgeClass, Assertion } from 'openbadges-types';`
  - Uses types directly for DB method signatures
- **src/infrastructure/database/modules/postgresql/postgresql.database.ts**
  - `import { Issuer, BadgeClass, Assertion } from 'openbadges-types';`

### c. Utilities & Validation
- **src/utils/validation/entity-validator.ts**
  - Mentions OB3 types in comments and validation logic
  - Uses domain entities (Issuer, BadgeClass, Assertion) for validation
- **src/utils/jsonld/context-provider.ts**
  - `import { OB3 } from 'openbadges-types';`
  - Uses `Partial<OB3.VerifiableCredential>`

---

## 2. Observations & Potential Issues
- **Issuer entity** is the only one using `Shared.IRI` and `Shared.OB3ImageObject` for strong typing.
- **BadgeClass** and **Assertion** entities use OB2/OB3 types for structure, but still use plain `string` for fields like `id`, `image`, etc., not the branded/shared types.
- **Database interfaces** and **implementations** use the types from openbadges-types, but may not be fully spec-aligned (e.g., image as string only).
- **Validation and serialization** utilities rely on the domain entities, so any type changes should propagate there.
- **Type unions** like `OB2.Criteria | OB3.Criteria` and `OB2.Evidence[] | OB3.Evidence[]` are used for version-agnostic logic.

---

## 3. Recommendations / Next Steps
- [ ] **Align BadgeClass and Assertion entities** to use `Shared.IRI` (and `Shared.OB3ImageObject` for image if spec allows) for consistency and type safety.
- [ ] **Review all DB interfaces and implementations** to ensure they use the correct types for fields like `id`, `image`, etc.
- [ ] **Check OpenAPI schema** (src/api/openapi.ts) for alignment with shared types, especially for `image` fields.
- [ ] **Document any spec mismatches** or places where the codebase diverges from Open Badges 2.0/3.0.
- [ ] **Update tests** if needed to use the branded/shared types.
- [ ] **Review all OB2/OB3 type unions** for correctness and maintainability.

---

## 4. Parking Lot
- Consider a migration plan for updating all entities and interfaces to use the shared types.
- Note any friction points or blockers for full type alignment.

---

**Created by: AI code review agent**
**Date:** {{DATE}} 