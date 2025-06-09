/**
 * JWKS (JSON Web Key Set) Controller
 *
 * This controller handles the JWKS endpoint for serving public keys
 * in JSON Web Key format as specified in RFC 7517.
 */

import { KeyService, JsonWebKeySet } from '../../core/key.service';
import { logger } from '../../utils/logging/logger.service';

/**
 * Controller for JWKS endpoints
 */
export class JwksController {
  /**
   * Gets the JSON Web Key Set (JWKS) containing all active public keys
   * @returns The JWKS response
   */
  async getJwks(): Promise<{
    status: number;
    body: JsonWebKeySet | { error: string };
  }> {
    try {
      logger.debug('Retrieving JWKS');

      // Get the JWKS from the key service
      const jwks = await KeyService.getJwkSet();

      // Log the number of keys returned (without exposing key details)
      logger.info('JWKS retrieved successfully', {
        keyCount: jwks.keys.length,
        keyIds: jwks.keys.map((key) => key.kid).filter(Boolean),
      });

      return {
        status: 200,
        body: jwks,
      };
    } catch (error) {
      logger.error('Failed to retrieve JWKS', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        status: 500,
        body: {
          error: 'Internal server error while retrieving JWKS',
        },
      };
    }
  }

  /**
   * Gets information about key status (for administrative purposes)
   * @returns Key status information
   */
  async getKeyStatus(): Promise<{
    status: number;
    body: Record<string, unknown>;
  }> {
    try {
      logger.debug('Retrieving key status information');

      const statusInfo = KeyService.getKeyStatusInfo();
      const statusData: Record<string, unknown> = {};

      for (const [keyId, info] of statusInfo.entries()) {
        statusData[keyId] = {
          status: info.status,
          created: info.metadata?.created,
          rotatedAt: info.metadata?.rotatedAt,
          keyType: info.metadata?.keyType,
          cryptosuite: info.metadata?.cryptosuite,
        };
      }

      logger.info('Key status retrieved successfully', {
        keyCount: statusInfo.size,
      });

      return {
        status: 200,
        body: {
          keys: statusData,
          totalKeys: statusInfo.size,
        },
      };
    } catch (error) {
      logger.error('Failed to retrieve key status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        status: 500,
        body: {
          error: 'Internal server error while retrieving key status',
        },
      };
    }
  }
}
