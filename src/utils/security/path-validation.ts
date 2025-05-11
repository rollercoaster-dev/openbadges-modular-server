/**
 * Path validation utilities
 * 
 * This file contains utilities for validating file paths to prevent path traversal attacks.
 */

import * as path from 'path';
import { logger } from '../logging/logger.service';

/**
 * Validates a file path to prevent path traversal attacks
 * 
 * @param filePath The file path to validate
 * @param basePath The base path that the file path should be within
 * @returns True if the file path is valid, false otherwise
 */
export function isValidFilePath(filePath: string, basePath: string): boolean {
  try {
    // Normalize the paths to resolve any '..' or '.' segments
    const normalizedFilePath = path.normalize(filePath);
    const normalizedBasePath = path.normalize(basePath);
    
    // Check if the normalized file path starts with the normalized base path
    const isWithinBasePath = normalizedFilePath.startsWith(normalizedBasePath);
    
    // Check if the file path contains any directory traversal sequences
    const hasTraversalSequences = normalizedFilePath.includes('../') || normalizedFilePath.includes('..\\');
    
    // Log validation result
    if (!isWithinBasePath || hasTraversalSequences) {
      logger.warn('Invalid file path detected', {
        filePath,
        basePath,
        normalizedFilePath,
        normalizedBasePath,
        isWithinBasePath,
        hasTraversalSequences
      });
    }
    
    return isWithinBasePath && !hasTraversalSequences;
  } catch (error) {
    logger.error('Error validating file path', {
      error: error instanceof Error ? error.message : String(error),
      filePath,
      basePath
    });
    return false;
  }
}

/**
 * Sanitizes a file path to prevent path traversal attacks
 * 
 * @param filePath The file path to sanitize
 * @returns The sanitized file path
 */
export function sanitizeFilePath(filePath: string): string {
  try {
    // Remove any directory traversal sequences
    let sanitized = filePath.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
    
    // Normalize the path to resolve any remaining '..' or '.' segments
    sanitized = path.normalize(sanitized);
    
    // Remove any leading slashes to prevent absolute paths
    sanitized = sanitized.replace(/^[\/\\]+/, '');
    
    return sanitized;
  } catch (error) {
    logger.error('Error sanitizing file path', {
      error: error instanceof Error ? error.message : String(error),
      filePath
    });
    return '';
  }
}

/**
 * Generates a secure random filename
 * 
 * @param originalFilename The original filename
 * @returns A secure random filename
 */
export function generateSecureFilename(originalFilename: string): string {
  try {
    // Get the file extension
    const ext = path.extname(originalFilename);
    
    // Generate a random UUID for the filename
    const uuid = crypto.randomUUID();
    
    // Combine the UUID and extension
    return `${uuid}${ext}`;
  } catch (error) {
    logger.error('Error generating secure filename', {
      error: error instanceof Error ? error.message : String(error),
      originalFilename
    });
    return crypto.randomUUID();
  }
}
