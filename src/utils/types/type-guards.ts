/**
 * Type guards for working with openbadges-types
 *
 * This file provides type guard functions for checking if values conform to
 * the expected types from the openbadges-types package.
 */

import { OB2, OB3, Shared, isIRI, createIRI } from 'openbadges-types';
import { isValidUrl } from './type-utils';

/**
 * Type guard to check if a value is a valid OB2.Image
 * @param value Value to check
 * @returns True if the value is a valid OB2.Image
 */
export function isOB2Image(value: unknown): value is OB2.Image {
  if (!value || typeof value !== 'object') return false;

  const img = value as Partial<OB2.Image>;

  // Check if it has the basic structure of an OB2.Image
  return (
    // Either has an id that's a string
    (typeof img.id === 'string') ||
    // Or has a caption or author
    (typeof img.caption === 'string') ||
    (typeof img.author === 'string')
  );
}

/**
 * Type guard to check if a value is a valid OB3.OB3ImageObject
 * @param value Value to check
 * @returns True if the value is a valid OB3.OB3ImageObject
 */
export function isOB3ImageObject(value: unknown): value is Shared.OB3ImageObject {
  if (!value || typeof value !== 'object') return false;

  const img = value as Partial<Shared.OB3ImageObject>;

  // Check required properties according to OB3 spec
  return (
    // Must have an id that's a valid IRI
    isIRI(img.id as string) &&
    // Must have type = 'Image'
    img.type === 'Image'
  );
}

/**
 * Normalizes various image formats to a consistent format
 * @param image Image in various formats
 * @returns Normalized image as IRI or OB3ImageObject
 */
export function normalizeImage(
  image: string | OB2.Image | Shared.OB3ImageObject | undefined
): Shared.IRI | Shared.OB3ImageObject | undefined {
  if (!image) return undefined;

  // If it's a string, convert to IRI if it's a valid URL
  if (typeof image === 'string') {
    if (isValidUrl(image)) {
      return createIRI(image);
    }
    return undefined;
  }

  // If it's an OB2.Image, convert to OB3ImageObject if possible
  if (isOB2Image(image)) {
    if (image.id && isValidUrl(image.id)) {
      return {
        id: createIRI(image.id),
        type: 'Image',
        caption: image.caption,
        author: image.author
      };
    }
    // If it doesn't have a valid ID, we can't convert it properly
    return undefined;
  }

  // If it's already an OB3ImageObject, return it as is
  if (isOB3ImageObject(image)) {
    return image;
  }

  // Fallback
  return undefined;
}

/**
 * Type guard to check if a value is a valid OB2.IdentityObject
 * @param value Value to check
 * @returns True if the value is a valid OB2.IdentityObject
 */
export function isOB2IdentityObject(value: unknown): value is OB2.IdentityObject {
  if (!value || typeof value !== 'object') return false;

  const identity = value as Partial<OB2.IdentityObject>;

  // Check required properties according to OB2 spec
  return (
    typeof identity.type === 'string' &&
    typeof identity.identity === 'string'
  );
}

/**
 * Type guard to check if a value is a valid OB3.IdentityObject
 * @param value Value to check
 * @returns True if the value is a valid OB3.IdentityObject
 */
export function isOB3IdentityObject(value: unknown): value is OB3.IdentityObject {
  if (!value || typeof value !== 'object') return false;

  const identity = value as Partial<OB3.IdentityObject>;

  // Check required properties according to OB3 spec
  return typeof identity.identityHash === 'string';
}

/**
 * Type guard to check if a value is a valid OB2.Criteria
 * @param value Value to check
 * @returns True if the value is a valid OB2.Criteria
 */
export function isOB2Criteria(value: unknown): value is OB2.Criteria {
  if (!value || typeof value !== 'object') return false;

  const criteria = value as Partial<OB2.Criteria>;

  // Check if it has the basic structure of OB2.Criteria
  return (
    // Either has an id that's a string
    (typeof criteria.id === 'string') ||
    // Or has a narrative
    (typeof criteria.narrative === 'string')
  );
}

/**
 * Type guard to check if a value is a valid OB3.Criteria
 * @param value Value to check
 * @returns True if the value is a valid OB3.Criteria
 */
export function isOB3Criteria(value: unknown): value is OB3.Criteria {
  if (!value || typeof value !== 'object') return false;

  const criteria = value as Partial<OB3.Criteria>;

  // Check if it has the basic structure of OB3.Criteria
  return (
    // Either has an id that's a string
    (typeof criteria.id === 'string') ||
    // Or has a narrative
    (typeof criteria.narrative === 'string') ||
    // Or has a type
    (typeof criteria.type === 'string' || Array.isArray(criteria.type))
  );
}

/**
 * Normalizes various criteria formats to a consistent format
 * @param criteria Criteria in various formats
 * @returns Normalized criteria
 */
export function normalizeCriteria(
  criteria: string | OB2.Criteria | OB3.Criteria | undefined
): OB2.Criteria | OB3.Criteria | Shared.IRI | undefined {
  if (!criteria) return undefined;

  // If it's a string, treat it as an IRI if it's a valid URL
  if (typeof criteria === 'string') {
    if (isValidUrl(criteria)) {
      return createIRI(criteria);
    }
    // Otherwise, create a simple criteria object with a narrative
    return { narrative: criteria };
  }

  // If it's already a criteria object, return it as is
  if (isOB2Criteria(criteria) || isOB3Criteria(criteria)) {
    return criteria;
  }

  // Fallback
  return undefined;
}
