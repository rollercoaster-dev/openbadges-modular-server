/**
 * GZIP compression utilities for StatusList2021 implementation
 *
 * This module provides GZIP compression and decompression utilities
 * optimized for bitstring status lists.
 */

import { gzipSync, gunzipSync, constants } from 'zlib';
import { logger } from '../logging/logger.service';

/**
 * GZIP compression options optimized for bitstrings
 */
export interface GzipOptions {
  /** Compression level (0-9, 9 = maximum compression) */
  level?: number;
  /** Window size (8-15) */
  windowBits?: number;
  /** Memory level (1-9) */
  memLevel?: number;
  /** Compression strategy */
  strategy?: number;
}

/**
 * Default GZIP options for bitstring compression
 */
export const DEFAULT_GZIP_OPTIONS: GzipOptions = {
  level: 9, // Maximum compression for best space efficiency
  windowBits: 15, // Maximum window size for best compression
  memLevel: 8, // Good balance of memory usage and compression
  strategy: constants.Z_DEFAULT_STRATEGY,
};

/**
 * GZIP utilities class
 */
export class GzipUtils {
  /**
   * Compresses data using GZIP with optimized settings for bitstrings
   * @param data Data to compress
   * @param options Compression options
   * @returns Compressed data
   */
  static compress(
    data: Uint8Array | Buffer,
    options: GzipOptions = {}
  ): Buffer {
    const opts = { ...DEFAULT_GZIP_OPTIONS, ...options };

    try {
      const startTime = Date.now();
      const compressed = gzipSync(data, opts);
      const compressionTime = Date.now() - startTime;

      const originalSize = data.length;
      const compressedSize = compressed.length;
      const compressionRatio = compressedSize / originalSize;
      const spaceSavings =
        ((originalSize - compressedSize) / originalSize) * 100;

      logger.debug('GZIP compression completed', {
        originalSize,
        compressedSize,
        compressionRatio: compressionRatio.toFixed(3),
        spaceSavings: spaceSavings.toFixed(1) + '%',
        compressionTime: compressionTime + 'ms',
        level: opts.level,
      });

      return compressed;
    } catch (error) {
      logger.error('GZIP compression failed', {
        error: error instanceof Error ? error.message : String(error),
        dataSize: data.length,
        options: opts,
      });
      throw new Error(
        `GZIP compression failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Decompresses GZIP-compressed data
   * @param compressedData Compressed data to decompress
   * @returns Decompressed data
   */
  static decompress(compressedData: Buffer): Uint8Array {
    try {
      const startTime = Date.now();
      const decompressed = gunzipSync(compressedData);
      const decompressionTime = Date.now() - startTime;

      logger.debug('GZIP decompression completed', {
        compressedSize: compressedData.length,
        decompressedSize: decompressed.length,
        expansionRatio: (decompressed.length / compressedData.length).toFixed(
          3
        ),
        decompressionTime: decompressionTime + 'ms',
      });

      return new Uint8Array(decompressed);
    } catch (error) {
      logger.error('GZIP decompression failed', {
        error: error instanceof Error ? error.message : String(error),
        compressedSize: compressedData.length,
      });
      throw new Error(
        `GZIP decompression failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Tests compression efficiency for different levels
   * @param data Data to test compression on
   * @returns Compression test results
   */
  static testCompressionLevels(data: Uint8Array | Buffer): Array<{
    level: number;
    compressedSize: number;
    compressionRatio: number;
    compressionTime: number;
  }> {
    const results = [];

    for (let level = 1; level <= 9; level++) {
      const startTime = Date.now();
      const compressed = gzipSync(data, { level });
      const compressionTime = Date.now() - startTime;

      results.push({
        level,
        compressedSize: compressed.length,
        compressionRatio: compressed.length / data.length,
        compressionTime,
      });
    }

    logger.info('Compression level test results', {
      originalSize: data.length,
      results: results.map((r) => ({
        level: r.level,
        size: r.compressedSize,
        ratio: r.compressionRatio.toFixed(3),
        time: r.compressionTime + 'ms',
      })),
    });

    return results;
  }

  /**
   * Validates that data is GZIP-compressed
   * @param data Data to validate
   * @returns True if data appears to be GZIP-compressed
   */
  static isGzipCompressed(data: Buffer): boolean {
    // GZIP files start with magic bytes 0x1f 0x8b
    return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
  }

  /**
   * Gets compression statistics for data
   * @param originalData Original uncompressed data
   * @param compressedData Compressed data
   * @returns Compression statistics
   */
  static getCompressionStats(
    originalData: Uint8Array | Buffer,
    compressedData: Buffer
  ): {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    spaceSavings: number;
    spaceSavingsPercent: string;
  } {
    const originalSize = originalData.length;
    const compressedSize = compressedData.length;
    const compressionRatio = compressedSize / originalSize;
    const spaceSavings = originalSize - compressedSize;
    const spaceSavingsPercent =
      ((spaceSavings / originalSize) * 100).toFixed(1) + '%';

    return {
      originalSize,
      compressedSize,
      compressionRatio,
      spaceSavings,
      spaceSavingsPercent,
    };
  }

  /**
   * Compresses data with automatic level selection based on size
   * @param data Data to compress
   * @returns Compressed data with optimal compression level
   */
  static compressOptimal(data: Uint8Array | Buffer): Buffer {
    // For small data (< 1KB), use maximum compression
    if (data.length < 1024) {
      return this.compress(data, { level: 9 });
    }

    // For medium data (1KB - 100KB), use level 6 for good balance
    if (data.length < 102400) {
      return this.compress(data, { level: 6 });
    }

    // For large data (> 100KB), use level 3 for faster compression
    return this.compress(data, { level: 3 });
  }

  /**
   * Estimates compression ratio for bitstring data
   * @param totalEntries Total number of entries in bitstring
   * @param usedEntries Number of used (non-zero) entries
   * @param statusSize Size of each status entry in bits
   * @returns Estimated compression ratio
   */
  static estimateBitstringCompressionRatio(
    totalEntries: number,
    usedEntries: number,
    _statusSize: number = 1
  ): number {
    // For mostly empty bitstrings, GZIP achieves excellent compression
    const usageRatio = usedEntries / totalEntries;

    if (usageRatio < 0.01) {
      // Less than 1% usage - excellent compression (>95% reduction)
      return 0.05;
    } else if (usageRatio < 0.1) {
      // Less than 10% usage - very good compression (>90% reduction)
      return 0.1;
    } else if (usageRatio < 0.5) {
      // Less than 50% usage - good compression (>70% reduction)
      return 0.3;
    } else {
      // High usage - moderate compression (~50% reduction)
      return 0.5;
    }
  }
}
