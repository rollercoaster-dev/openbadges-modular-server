/**
 * Zod schemas for Assertion-related API endpoint validation.
 */
import { z } from 'zod';

// Schema for RecipientDto
export const RecipientSchema = z
  .object({
    type: z.string(),
    identity: z.string(),
    hashed: z.boolean(),
    salt: z.string().optional(),
  })
  .strict('Unrecognized fields in recipient object');

// Schema for VerificationDto
export const VerificationSchema = z
  .object({
    type: z.union([z.string(), z.array(z.string())]),
    allowedOrigins: z.array(z.string().url()).optional(), // Assuming origins should be valid URLs
    verificationProperty: z.string().optional(),
    startsWith: z.array(z.string()).optional(),
  })
  .strict('Unrecognized fields in verification object');

// Schema for EvidenceDto
export const EvidenceSchema = z
  .object({
    id: z.string().optional(), // Assuming ID can be any string, potentially an IRI
    type: z.union([z.string(), z.array(z.string())]).optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    narrative: z.string().optional(),
    genre: z.string().optional(),
    audience: z.string().optional(),
  })
  .strict('Unrecognized fields in evidence object');

// Schema for AssertionBaseDto
export const AssertionBaseSchema = z.object({
  recipient: RecipientSchema,
  badge: z.string(), // Badge Class IRI - using string for flexibility
  issuedOn: z
    .string()
    .datetime({ message: 'Invalid ISO 8601 date string format for issuedOn' }),
  verification: VerificationSchema.optional(),
  evidence: z.union([EvidenceSchema, z.array(EvidenceSchema)]).optional(),
  narrative: z.string().optional(),
  expires: z
    .string()
    .datetime({ message: 'Invalid ISO 8601 date string format for expires' })
    .optional(),
  image: z
    .union([
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
    ])
    .optional(),
  revoked: z.boolean().optional(),
  revocationReason: z.string().optional(),
}); // Not strict here, allow extension

// Schema for CreateAssertionOB2Dto
export const CreateAssertionOB2Schema = AssertionBaseSchema.extend({
  type: z.union([z.string(), z.array(z.string())]).optional(),
  '@context': z.string().optional(), // Allow @context field for OB2
}).strict('Unrecognized fields in OB2 assertion data');

// Schema for CreateAssertionOB3Dto
export const CreateAssertionOB3Schema = AssertionBaseSchema.extend({
  type: z.string().optional(), // Typically string in OB3
  id: z.string().optional(), // Allow client-suggested ID
  credentialSubject: z
    .object({
      id: z.string().optional(),
      type: z.string().optional(),
      achievement: z.record(z.unknown()).optional(),
    })
    .passthrough() // Allow additional properties for OB3 flexibility
    .optional(), // Allow flexible credentialSubject with basic structure
  '@context': z.string().optional(), // Allow @context field for OB3
}).strict('Unrecognized fields in OB3 assertion data');

// Union schema for CreateAssertionDto
export const CreateAssertionSchema = z.union([
  CreateAssertionOB2Schema,
  CreateAssertionOB3Schema,
]);

// Schema for UpdateAssertionDto
// Apply .partial() to each member schema and create a new union
export const UpdateAssertionSchema = z.union([
  CreateAssertionOB2Schema.partial(),
  CreateAssertionOB3Schema.partial(),
]);

// Schema for RevokeAssertionDto
export const RevokeAssertionSchema = z
  .object({
    revoked: z.boolean(),
    revocationReason: z.string().optional(),
  })
  .strict('Unrecognized fields in revocation data');

// Schema for BatchCreateCredentialsDto
export const BatchCreateCredentialsSchema = z
  .object({
    credentials: z
      .array(CreateAssertionSchema)
      .min(1, 'At least one credential is required')
      .max(100, 'Maximum 100 credentials per batch'),
  })
  .strict('Unrecognized fields in batch create credentials data');

// Schema for BatchRetrieveCredentialsDto
export const BatchRetrieveCredentialsSchema = z
  .object({
    ids: z
      .array(z.string().min(1, 'ID cannot be empty'))
      .min(1, 'At least one ID is required')
      .max(100, 'Maximum 100 IDs per batch'),
  })
  .strict('Unrecognized fields in batch retrieve credentials data');

// Schema for UpdateCredentialStatusDto (single credential)
export const UpdateCredentialStatusSchema = z
  .object({
    status: z
      .enum(['0', '1'], {
        errorMap: () => ({
          message: 'Status must be 0 (active) or 1 (revoked/suspended)',
        }),
      })
      .transform(Number),
    reason: z.string().min(1, 'Reason cannot be empty if provided').optional(),
    purpose: z.enum(['revocation', 'suspension'], {
      errorMap: () => ({
        message: 'Purpose must be one of: revocation, suspension',
      }),
    }),
  })
  .strict('Unrecognized fields in credential status update data');

// Schema for BatchUpdateCredentialStatusDto
export const BatchUpdateCredentialStatusSchema = z
  .object({
    updates: z
      .array(
        z
          .object({
            id: z.string().min(1, 'ID cannot be empty'),
            status: z.enum(['revoked', 'suspended', 'active'], {
              errorMap: () => ({
                message: 'Status must be one of: revoked, suspended, active',
              }),
            }),
            reason: z
              .string()
              .min(1, 'Reason cannot be empty if provided')
              .optional(),
          })
          .strict('Unrecognized fields in status update object')
      )
      .min(1, 'At least one update is required')
      .max(100, 'Maximum 100 updates per batch'),
  })
  .strict('Unrecognized fields in batch update credential status data');
