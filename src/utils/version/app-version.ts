/**
 * Application Version Management
 *
 * This module provides utilities for managing and exposing the application version.
 * It follows semantic versioning principles (MAJOR.MINOR.PATCH).
 */

import { logger } from '../logging/logger.service';

/**
 * Interface for version information
 */
export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
  buildMetadata?: string;
  gitCommit?: string;
  buildDate?: string;
}

/**
 * Parses a semantic version string into its components
 * @param version The version string to parse (e.g., "1.2.3-beta.1+build.123")
 * @returns Parsed version information
 */
export function parseVersion(version: string): VersionInfo {
  // Semantic version regex pattern
  // Matches: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILDMETADATA]
  const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

  const match = version.match(semverPattern);

  if (!match) {
    logger.warn(`Invalid version format: ${version}. Expected format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILDMETADATA]. Using default values.`);
    return {
      version,
      major: 0,
      minor: 0,
      patch: 0
    };
  }

  return {
    version,
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    preRelease: match[4],
    buildMetadata: match[5]
  };
}

/**
 * Compares two semantic versions
 * @param version1 First version to compare
 * @param version2 Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  // Compare major version
  if (v1.major !== v2.major) {
    return v1.major < v2.major ? -1 : 1;
  }

  // Compare minor version
  if (v1.minor !== v2.minor) {
    return v1.minor < v2.minor ? -1 : 1;
  }

  // Compare patch version
  if (v1.patch !== v2.patch) {
    return v1.patch < v2.patch ? -1 : 1;
  }

  // If we get here, the versions are equal (ignoring pre-release and build metadata)
  return 0;
}

/**
 * Gets the current application version
 * @returns The current application version information
 */
export function getAppVersion(): VersionInfo {
  try {
    // Try to get version from package.json
    // Note: In production builds, this might need to be injected during build time
    const packageJson = { version: process.env.APP_VERSION || '1.0.0' };

    const versionInfo = parseVersion(packageJson.version);

    // Add git commit hash if available
    if (process.env.GIT_COMMIT) {
      versionInfo.gitCommit = process.env.GIT_COMMIT;
    }

    // Add build date if available
    if (process.env.BUILD_DATE) {
      versionInfo.buildDate = process.env.BUILD_DATE;
    }

    return versionInfo;
  } catch (error) {
    logger.warn('Failed to get application version', { error });
    return {
      version: '1.0.0',
      major: 1,
      minor: 0,
      patch: 0
    };
  }
}

/**
 * Formats version information as a string
 * @param versionInfo The version information to format
 * @returns Formatted version string
 */
export function formatVersion(versionInfo: VersionInfo): string {
  let formattedVersion = versionInfo.version;

  if (versionInfo.gitCommit) {
    // Use only the first 7 characters of the git commit hash, which is the standard
    // short format used by Git and is typically sufficient to uniquely identify a commit
    // while keeping the displayed version string concise and readable
    formattedVersion += ` (${versionInfo.gitCommit.substring(0, 7)})`;
  }

  if (versionInfo.buildDate) {
    formattedVersion += ` built on ${versionInfo.buildDate}`;
  }

  return formattedVersion;
}
