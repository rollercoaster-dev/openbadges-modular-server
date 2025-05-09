/**
 * JSON-LD context provider for Open Badges API
 *
 * This file provides utilities for working with JSON-LD contexts
 * according to the Open Badges 3.0 specification.
 */


import { Shared } from 'openbadges-types';
import { IssuerData, BadgeClassData, AssertionData, VerifiableCredentialData } from '../types/badge-data.types';

/**
 * The Open Badges 3.0 JSON-LD context
 */
export const OPEN_BADGES_CONTEXT = 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json';

/**
 * Adds JSON-LD context to an object
 * @param obj The object to add context to
 * @returns The object with context added
 */
export function addContext<T extends Record<string, unknown>>(obj: T): T & { '@context': string } {
  return {
    '@context': OPEN_BADGES_CONTEXT,
    ...obj
  };
}

/**
 * Creates a JSON-LD representation of an issuer
 * @param issuer The issuer object
 * @returns A JSON-LD representation of the issuer
 */
export function createIssuerJsonLd(issuer: IssuerData): IssuerData & { '@context': string; type: string } {
  return addContext({
    type: 'Profile',
    id: issuer.id,
    name: issuer.name,
    url: issuer.url,
    ...(issuer.email && { email: issuer.email }),
    ...(issuer.description && { description: issuer.description }),
    ...(issuer.image && { image: issuer.image }),
    ...(issuer.publicKey && { publicKey: issuer.publicKey })
  });
}

/**
 * Creates a JSON-LD representation of a badge class
 * @param badgeClass The badge class object
 * @returns A JSON-LD representation of the badge class
 */
export function createBadgeClassJsonLd(badgeClass: BadgeClassData): BadgeClassData & { '@context': string; type: string } {
  return addContext({
    type: 'BadgeClass',
    id: badgeClass.id,
    issuer: badgeClass.issuer,
    name: badgeClass.name,
    description: badgeClass.description,
    image: badgeClass.image,
    criteria: badgeClass.criteria,
    ...(badgeClass.alignment && { alignment: badgeClass.alignment }),
    ...(badgeClass.tags && { tags: badgeClass.tags })
  });
}

/**
 * Creates a JSON-LD representation of an assertion
 * @param assertion The assertion object
 * @returns A JSON-LD representation of the assertion
 */
export function createAssertionJsonLd(assertion: AssertionData): AssertionData & { '@context': string; type: string } {
  return addContext({
    type: 'Assertion',
    id: assertion.id,
    badgeClass: assertion.badgeClass,
    recipient: assertion.recipient,
    issuedOn: assertion.issuedOn,
    ...(assertion.expires && { expires: assertion.expires }),
    ...(assertion.evidence && { evidence: assertion.evidence }),
    ...(assertion.verification && { verification: assertion.verification }),
    ...(assertion.revoked !== undefined && { revoked: assertion.revoked }),
    ...(assertion.revocationReason && { revocationReason: assertion.revocationReason })
  });
}

/**
 * Creates a Verifiable Credential representation of an assertion
 * @param assertion The assertion object
 * @param badgeClass The badge class object
 * @param issuer The issuer object
 * @returns A Verifiable Credential representation of the assertion
 */
export function createVerifiableCredential(
  assertion: AssertionData,
  badgeClass: BadgeClassData,
  issuer: IssuerData
): VerifiableCredentialData {
  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
    ],
    id: assertion.id,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {
      id: issuer.id,
      type: issuer.type || 'Profile',
      name: issuer.name,
      url: issuer.url,
      ...(issuer.email && { email: issuer.email }),
      ...(issuer.description && { description: issuer.description }),
      ...(issuer.image && { image: issuer.image })
    },
    issuanceDate: assertion.issuedOn,
    ...(assertion.expires && { expirationDate: assertion.expires }),
    credentialSubject: {
      id: assertion.recipient.identity,
      type: 'AchievementSubject',
      achievement: {
        id: badgeClass.id,
        type: 'Achievement',
        name: badgeClass.name,
        description: badgeClass.description,
        image: badgeClass.image,
        criteria: badgeClass.criteria,
        ...(badgeClass.alignment && { alignments: badgeClass.alignment }),
        ...(badgeClass.tags && { tags: badgeClass.tags })
      }
    },
    ...(assertion.evidence && { evidence: assertion.evidence }),
    ...(assertion.verification && {
      proof: {
        type: assertion.verification.type,
        created: assertion.verification.created,
        verificationMethod: assertion.verification.creator,
        proofPurpose: 'assertionMethod',
        proofValue: assertion.verification.signatureValue
      }
    }),
    ...(assertion.revoked !== undefined && {
      credentialStatus: {
        id: `${assertion.id}#status` as Shared.IRI,
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '0',
        statusListCredential: `${assertion.id}#list` as Shared.IRI
      }
    })
  };
}
