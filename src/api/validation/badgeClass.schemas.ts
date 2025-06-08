/**
 * Validation schemas for BadgeClass (Achievement) entities
 *
 * Supports both Open Badges 2.0 and 3.0 specifications with proper validation
 * for versioning and relationship fields introduced in OB 3.0.
 */

import { z } from 'zod';

/**
 * Alignment schema for achievement alignment objects
 */
const AlignmentSchema = z.object({
  targetName: z.string(),
  targetUrl: z.string().url(),
  targetDescription: z.string().optional(),
  targetFramework: z.string().optional(),
  targetCode: z.string().optional(),
});

/**
 * Base schema for BadgeClass/Achievement validation
 * Includes all standard OB 2.0 fields plus OB 3.0 extensions
 */
const BaseBadgeClassSchema = z.object({
  '@context': z
    .union([
      z.string(),
      z.array(z.string()),
      z.object({}).passthrough(), // Allow context objects
    ])
    .optional(),
  id: z.string().optional(), // IRI - optional for creation, required for updates
  type: z
    .union([
      z.literal('BadgeClass'), // OB 2.0
      z.array(z.string()), // OB 3.0 - array of types including 'Achievement'
    ])
    .optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  image: z.union([
    z.string().url(), // IRI to image
    z.object({
      id: z.string().url(),
      type: z.literal('Image'),
      caption: z.string().optional(),
    }), // OB 3.0 Image object
  ]),
  criteria: z.union([
    z.string().url(), // IRI to criteria (OB 2.0)
    z.object({
      narrative: z.string().optional(),
    }), // OB 3.0 Criteria object
  ]),
  issuer: z.string(), // Issuer IRI - using string for flexibility, validation happens elsewhere
  tags: z.array(z.string()).optional(),
  alignment: z.array(AlignmentSchema).optional(),
  // Achievement versioning fields (OB 3.0)
  version: z.string().optional(),
  previousVersion: z.string().url().optional(), // IRI reference to previous version
  // Achievement relationship fields (OB 3.0)
  related: z
    .array(
      z.object({
        id: z.string(), // IRI of related achievement
        type: z.tuple([z.literal('Related')]), // Must be ["Related"]
        inLanguage: z.string().optional(), // BCP47 language code
        version: z.string().optional(), // Version of related achievement
      })
    )
    .optional(),
  endorsement: z
    .array(
      z
        .object({
          '@context': z.array(z.string()),
          id: z.string(),
          type: z.array(z.string()),
          issuer: z.union([
            z.string(),
            z.object({
              id: z.string(),
              type: z.array(z.string()),
              name: z.string().optional(),
            }),
          ]),
          validFrom: z.string(),
          credentialSubject: z.object({
            id: z.string(),
            type: z.array(z.string()),
            endorsementComment: z.string().optional(),
          }),
        })
        .passthrough()
    )
    .optional(), // Allow additional VC fields
}); // Not strict here, allow extension by OB2/OB3 and unknown keys

/**
 * Schema for creating a new BadgeClass/Achievement
 */
export const CreateBadgeClassSchema = BaseBadgeClassSchema.omit({
  id: true, // ID should not be provided during creation
});

/**
 * Schema for updating an existing BadgeClass/Achievement
 */
export const UpdateBadgeClassSchema = BaseBadgeClassSchema.partial().extend({
  id: z.string().optional(), // ID is optional for updates (can be in URL)
});

/**
 * Schema for validating relationship data when adding related achievements
 */
export const RelatedAchievementSchema = z.object({
  id: z.string(), // IRI of related achievement
  type: z.tuple([z.literal('Related')]), // Must be ["Related"]
  inLanguage: z.string().optional(), // BCP47 language code
  version: z.string().optional(), // Version of related achievement
});

/**
 * Schema for validating endorsement credentials
 */
export const EndorsementCredentialSchema = z
  .object({
    '@context': z.array(z.string()),
    id: z.string(),
    type: z.array(z.string()),
    issuer: z.union([
      z.string(),
      z.object({
        id: z.string(),
        type: z.array(z.string()),
        name: z.string().optional(),
      }),
    ]),
    validFrom: z.string(),
    credentialSubject: z.object({
      id: z.string(),
      type: z.array(z.string()),
      endorsementComment: z.string().optional(),
    }),
  })
  .passthrough(); // Allow additional VerifiableCredential fields

/**
 * Type definitions derived from schemas
 */
export type CreateBadgeClassDto = z.infer<typeof CreateBadgeClassSchema>;
export type UpdateBadgeClassDto = z.infer<typeof UpdateBadgeClassSchema>;
export type RelatedAchievementDto = z.infer<typeof RelatedAchievementSchema>;
export type EndorsementCredentialDto = z.infer<
  typeof EndorsementCredentialSchema
>;
