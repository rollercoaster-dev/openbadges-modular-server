/**
 * Badge version enum for Open Badges API
 * 
 * This file defines the supported Open Badges versions.
 */

export enum BadgeVersion {
  V2 = '2.0',
  V3 = '3.0'
}

/**
 * Badge version context URLs
 */
export const BADGE_VERSION_CONTEXTS = {
  [BadgeVersion.V2]: 'https://w3id.org/openbadges/v2',
  [BadgeVersion.V3]: 'https://w3id.org/openbadges/v3'
};

/**
 * Detects the Open Badges version from a JSON-LD object
 * @param obj The JSON-LD object to check
 * @returns The detected badge version or undefined if not detected
 */
export function detectBadgeVersion(obj: Record<string, any>): BadgeVersion | undefined {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  // Check context
  const context = obj['@context'];
  if (!context) {
    return undefined;
  }

  // Handle array context
  if (Array.isArray(context)) {
    if (context.includes(BADGE_VERSION_CONTEXTS[BadgeVersion.V3])) {
      return BadgeVersion.V3;
    }
    if (context.includes(BADGE_VERSION_CONTEXTS[BadgeVersion.V2])) {
      return BadgeVersion.V2;
    }
    return undefined;
  }

  // Handle string context
  if (typeof context === 'string') {
    if (context === BADGE_VERSION_CONTEXTS[BadgeVersion.V3]) {
      return BadgeVersion.V3;
    }
    if (context === BADGE_VERSION_CONTEXTS[BadgeVersion.V2]) {
      return BadgeVersion.V2;
    }
  }

  // Handle object context
  if (typeof context === 'object') {
    const contextValues = Object.values(context);
    if (contextValues.includes(BADGE_VERSION_CONTEXTS[BadgeVersion.V3])) {
      return BadgeVersion.V3;
    }
    if (contextValues.includes(BADGE_VERSION_CONTEXTS[BadgeVersion.V2])) {
      return BadgeVersion.V2;
    }
  }

  return undefined;
}
