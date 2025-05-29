/**
 * Zod schemas for BadgeClass-related API endpoint validation.
 */
import { z } from 'zod';

// Schema for Alignment Object
export const AlignmentSchema = z
  .object({
    targetName: z.string().optional(),
    targetUrl: z
      .string()
      .url({ message: 'Alignment targetUrl must be a valid URL' })
      .optional(),
    targetDescription: z.string().optional(),
    targetFramework: z.string().optional(),
    targetCode: z.string().optional(),
  })
  .strict('Unrecognized fields in alignment object');

// Schema for BadgeClassBaseDto
export const BadgeClassBaseSchema = z.object({
  name: z.string(),
  description: z.string(),
  image: z.union([
    z.string().url({ message: 'Image must be a valid URL string' }), // Simple URL string
    z
      .object({
        // Image object
        id: z.string().optional(), // Assuming ID can be any string, potentially an IRI
        type: z.string().optional(),
        url: z
          .string()
          .url({ message: 'Image url must be a valid URL' })
          .optional(),
        caption: z.string().optional(),
      })
      .strict('Unrecognized fields in image object'),
  ]),
  criteria: z
    .union([
      z.string().url({ message: 'Criteria must be a valid URL string' }), // Simple URL string
      z
        .object({
          // Criteria object
          id: z.string().optional(), // Assuming ID can be any string, potentially an IRI
          narrative: z.string().optional(),
        })
        .strict('Unrecognized fields in criteria object'),
    ])
    .optional(),
  issuer: z.string(), // Issuer IRI - using string for flexibility, validation happens elsewhere
  tags: z.array(z.string()).optional(),
  alignment: z.array(AlignmentSchema).optional(),
}); // Not strict here, allow extension by OB2/OB3 and unknown keys

// Schema for CreateBadgeClassOB2Dto
export const CreateBadgeClassOB2Schema = BadgeClassBaseSchema.extend({
  type: z.union([z.string(), z.array(z.string())]).optional(),
  '@context': z.string().optional(), // Allow @context field for OB2
}).strict('Unrecognized fields in OB2 BadgeClass data');

// Schema for CreateBadgeClassOB3Dto
export const CreateBadgeClassOB3Schema = BadgeClassBaseSchema.extend({
  type: z.string().optional(), // Typically string in OB3
  id: z.string().optional(), // Allow client-suggested ID
  achievementType: z.string().optional(),
  '@context': z.string().optional(), // Allow @context field for OB3
}).strict('Unrecognized fields in OB3 BadgeClass/Achievement data');

// Union schema for CreateBadgeClassDto
export const CreateBadgeClassSchema = z.union([
  CreateBadgeClassOB2Schema,
  CreateBadgeClassOB3Schema,
]);

// Schema for UpdateBadgeClassDto
// Keep certain core fields required while allowing others to be optional
const UpdateBadgeClassOB2Schema = BadgeClassBaseSchema.extend({
  type: z.union([z.string(), z.array(z.string())]).optional(),
  '@context': z.string().optional(),
})
  .partial()
  .required({
    name: true, // Name is still required for updates
    issuer: true, // Issuer is still required for updates
    criteria: true, // Criteria is still required for updates
  })
  .strict('Unrecognized fields in OB2 BadgeClass update data');

const UpdateBadgeClassOB3Schema = BadgeClassBaseSchema.extend({
  type: z.string().optional(),
  id: z.string().optional(),
  achievementType: z.string().optional(),
  '@context': z.string().optional(),
})
  .partial()
  .required({
    name: true, // Name is still required for updates
    issuer: true, // Issuer is still required for updates
    criteria: true, // Criteria is still required for updates
  })
  .strict('Unrecognized fields in OB3 BadgeClass/Achievement update data');

export const UpdateBadgeClassSchema = z.union([
  UpdateBadgeClassOB2Schema,
  UpdateBadgeClassOB3Schema,
]);
