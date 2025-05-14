/**
 * Version Controller
 * 
 * This controller provides endpoints for retrieving application version information.
 */

import { getAppVersion, formatVersion } from '../../utils/version/app-version';
import { logger } from '../../utils/logging/logger.service';

/**
 * Controller for version-related endpoints
 */
export class VersionController {
  /**
   * Gets the current application version
   * @returns The current application version information
   */
  getVersion() {
    try {
      const versionInfo = getAppVersion();
      return {
        version: versionInfo.version,
        formatted: formatVersion(versionInfo),
        details: {
          major: versionInfo.major,
          minor: versionInfo.minor,
          patch: versionInfo.patch,
          preRelease: versionInfo.preRelease,
          buildMetadata: versionInfo.buildMetadata,
          gitCommit: versionInfo.gitCommit,
          buildDate: versionInfo.buildDate
        }
      };
    } catch (error) {
      logger.error('Failed to get version information', { error });
      return {
        version: '1.0.0',
        formatted: '1.0.0',
        details: {
          major: 1,
          minor: 0,
          patch: 0
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
