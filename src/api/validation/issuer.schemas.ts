/**
 * Zod schemas for Issuer-related API endpoint validation.
 */
import { z } from 'zod';

// Schema for IssuerBaseDto
export const IssuerBaseSchema = z.object({
  name: z.string(),
  url: z.string().url({ message: 'Issuer URL must be a valid URL' }),
  email: z.string().email({ message: 'Invalid email format' }).optional(),
  description: z.string().optional(),
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
  publicKey: z
    .object({
      id: z.string().optional(),
      type: z.string().optional(),
      publicKeyPem: z.string().optional(),
      publicKeyJwk: z.record(z.unknown()).optional(),
    })
    .passthrough() // Allow additional properties for flexibility
    .optional(), // Allow flexible publicKey object with basic structure
}); // Not strict here, allow extension by OB2/OB3 and unknown keys

// Schema for CreateIssuerOB2Dto
export const CreateIssuerOB2Schema = IssuerBaseSchema.extend({
  type: z.union([z.string(), z.array(z.string())]).optional(),
  '@context': z.string().optional(), // Allow @context field for OB2
}).strict('Unrecognized fields in OB2 Issuer data');

// Schema for CreateIssuerOB3Dto
export const CreateIssuerOB3Schema = IssuerBaseSchema.extend({
  type: z.string().optional(), // Typically string in OB3
  id: z.string().optional(), // Allow client-suggested ID
  '@context': z.string().optional(), // Allow @context field for OB3
}).strict('Unrecognized fields in OB3 Issuer data');

// Union schema for CreateIssuerDto
export const CreateIssuerSchema = z.union([
  CreateIssuerOB2Schema,
  CreateIssuerOB3Schema,
]);

// Schema for UpdateIssuerDto
// Apply .partial() to each member schema and create a new union
export const UpdateIssuerSchema = z.union([
  CreateIssuerOB2Schema.partial(),
  CreateIssuerOB3Schema.partial(),
]);
