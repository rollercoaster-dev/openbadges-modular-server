/**
 * Bitstring utilities for StatusList2021 (Bitstring Status List) implementation
 *
 * This module provides utilities for manipulating bitstrings according to the
 * W3C Bitstring Status List v1.0 specification.
 */

import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { logger } from '@/utils/logging/logger.service';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Default bitstring size (131,072 bits = 16KB)
 * This provides adequate group privacy according to the specification
 */
export const DEFAULT_BITSTRING_SIZE = 131072;

/**
 * Minimum bitstring size required by the specification
 */
export const MIN_BITSTRING_SIZE = 131072;

/**
 * Maximum supported status size in bits
 */
export const MAX_STATUS_SIZE = 8;

/**
 * Bitstring manipulation utilities
 */
export class BitstringUtils {
  /**
   * Creates a new empty bitstring with the specified number of entries and status size
   * @param totalEntries Total number of entries in the bitstring
   * @param statusSize Size of each status entry in bits (1, 2, 4, or 8)
   * @returns Empty bitstring as Uint8Array
   */
  static createEmptyBitstring(
    totalEntries: number = DEFAULT_BITSTRING_SIZE,
    statusSize: number = 1
  ): Uint8Array {
    if (totalEntries < MIN_BITSTRING_SIZE) {
      throw new Error(
        `Bitstring must have at least ${MIN_BITSTRING_SIZE} entries for privacy`
      );
    }

    if (![1, 2, 4, 8].includes(statusSize)) {
      throw new Error('Status size must be 1, 2, 4, or 8 bits');
    }

    const totalBits = totalEntries * statusSize;
    const totalBytes = Math.ceil(totalBits / 8);

    logger.debug('Creating empty bitstring', {
      totalEntries,
      statusSize,
      totalBits,
      totalBytes,
    });

    return new Uint8Array(totalBytes);
  }

  /**
   * Sets the status value at a specific index in the bitstring
   * @param bitstring The bitstring to modify
   * @param index The index to set (0-based)
   * @param value The status value to set
   * @param statusSize Size of each status entry in bits
   * @returns Modified bitstring
   */
  static setStatusAtIndex(
    bitstring: Uint8Array,
    index: number,
    value: number,
    statusSize: number = 1
  ): Uint8Array {
    if (index < 0) {
      throw new Error('Index must be non-negative');
    }

    if (![1, 2, 4, 8].includes(statusSize)) {
      throw new Error('Status size must be 1, 2, 4, or 8 bits');
    }

    const maxValue = Math.pow(2, statusSize) - 1;
    if (value < 0 || value > maxValue) {
      throw new Error(
        `Value must be between 0 and ${maxValue} for ${statusSize}-bit status`
      );
    }

    const totalBits = bitstring.length * 8;
    const totalEntries = Math.floor(totalBits / statusSize);

    if (index >= totalEntries) {
      throw new Error(
        `Index ${index} exceeds bitstring capacity of ${totalEntries} entries`
      );
    }

    // Calculate bit position (left-most bit is index 0)
    const bitPosition = index * statusSize;
    const byteIndex = Math.floor(bitPosition / 8);
    const bitOffset = bitPosition % 8;

    // Create a copy of the bitstring to avoid mutation
    const result = new Uint8Array(bitstring);

    // Handle negative-shift hazard by calculating bits that fit in first byte
    // This prevents (8 - bitOffset - statusSize) from becoming negative
    const firstPartBits = Math.min(statusSize, 8 - bitOffset);
    const firstPartMask =
      ((1 << firstPartBits) - 1) << (8 - bitOffset - firstPartBits);

    // Clear and set bits in the first byte
    result[byteIndex] &= ~firstPartMask & 0xff;
    result[byteIndex] |=
      ((value >> (statusSize - firstPartBits)) <<
        (8 - bitOffset - firstPartBits)) &
      0xff;

    // Handle remaining bits in the next byte if status spans byte boundary
    const remainingBits = statusSize - firstPartBits;
    if (remainingBits > 0) {
      if (byteIndex + 1 >= result.length) {
        throw new Error(
          `Index ${index} causes overflow; bitstring too small for ${statusSize}-bit status`
        );
      }
      const nextByteClearMask = ~(
        ((1 << remainingBits) - 1) <<
        (8 - remainingBits)
      );
      result[byteIndex + 1] &= nextByteClearMask & 0xff;

      const nextByteValueMask =
        (value & ((1 << remainingBits) - 1)) << (8 - remainingBits);
      result[byteIndex + 1] |= nextByteValueMask;
    }

    logger.debug('Set status at index', {
      index,
      value,
      statusSize,
      bitPosition,
      byteIndex,
      bitOffset,
    });

    return result;
  }

  /**
   * Gets the status value at a specific index in the bitstring
   * @param bitstring The bitstring to read from
   * @param index The index to read (0-based)
   * @param statusSize Size of each status entry in bits
   * @returns Status value at the specified index
   */
  static getStatusAtIndex(
    bitstring: Uint8Array,
    index: number,
    statusSize: number = 1
  ): number {
    if (index < 0) {
      throw new Error('Index must be non-negative');
    }

    if (![1, 2, 4, 8].includes(statusSize)) {
      throw new Error('Status size must be 1, 2, 4, or 8 bits');
    }

    const totalBits = bitstring.length * 8;
    const totalEntries = Math.floor(totalBits / statusSize);

    if (index >= totalEntries) {
      throw new Error(
        `Index ${index} exceeds bitstring capacity of ${totalEntries} entries`
      );
    }

    // Calculate bit position (left-most bit is index 0)
    const bitPosition = index * statusSize;
    const byteIndex = Math.floor(bitPosition / 8);
    const bitOffset = bitPosition % 8;

    // Handle negative-shift hazard by calculating bits that fit in first byte
    // This prevents (8 - bitOffset - statusSize) from becoming negative
    const firstPartBits = Math.min(statusSize, 8 - bitOffset);
    const firstPartShift = 8 - bitOffset - firstPartBits;

    // Extract bits from the first byte
    let value =
      (bitstring[byteIndex] >> firstPartShift) & ((1 << firstPartBits) - 1);

    // Handle remaining bits from the next byte if status spans byte boundary
    const remainingBits = statusSize - firstPartBits;
    if (remainingBits > 0 && byteIndex + 1 < bitstring.length) {
      const nextByteShift = 8 - remainingBits;
      const nextByteValue =
        (bitstring[byteIndex + 1] >> nextByteShift) &
        ((1 << remainingBits) - 1);

      // Combine the two parts: shift first part left and OR with second part
      value = (value << remainingBits) | nextByteValue;
    }

    return value;
  }

  /**
   * Compresses a bitstring using GZIP compression
   * @param bitstring The bitstring to compress
   * @returns Compressed bitstring
   */
  static async compressBitstring(bitstring: Uint8Array): Promise<Buffer> {
    try {
      const compressed = await gzipAsync(bitstring, {
        level: 9, // Maximum compression
        windowBits: 15,
        memLevel: 8,
      });

      logger.debug('Compressed bitstring', {
        originalSize: bitstring.length,
        compressedSize: compressed.length,
        compressionRatio: (compressed.length / bitstring.length).toFixed(3),
      });

      return compressed;
    } catch (error) {
      logger.error('Failed to compress bitstring', { error });
      throw new Error('Failed to compress bitstring');
    }
  }

  /**
   * Decompresses a GZIP-compressed bitstring
   * @param compressedData The compressed bitstring
   * @returns Decompressed bitstring
   */
  static async decompressBitstring(compressedData: Buffer): Promise<Uint8Array> {
    try {
      const decompressed = await gunzipAsync(compressedData);

      logger.debug('Decompressed bitstring', {
        compressedSize: compressedData.length,
        decompressedSize: decompressed.length,
      });

      return new Uint8Array(decompressed);
    } catch (error) {
      logger.error('Failed to decompress bitstring', { error });
      throw new Error('Failed to decompress bitstring');
    }
  }

  /**
   * Encodes a bitstring using multibase base64url encoding (no padding)
   * @param bitstring The bitstring to encode
   * @returns Base64url-encoded string with multibase prefix
   */
  static async encodeBitstring(bitstring: Uint8Array): Promise<string> {
    try {
      // First compress the bitstring
      const compressed = await this.compressBitstring(bitstring);

      // Convert to base64url (no padding)
      const base64 = compressed.toString('base64');
      const base64url = base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      // Add multibase prefix 'u' for base64url
      const encoded = 'u' + base64url;

      logger.debug('Encoded bitstring', {
        originalSize: bitstring.length,
        compressedSize: compressed.length,
        encodedLength: encoded.length,
      });

      return encoded;
    } catch (error) {
      logger.error('Failed to encode bitstring', { error });
      throw new Error('Failed to encode bitstring');
    }
  }

  /**
   * Decodes a multibase base64url-encoded bitstring
   * @param encodedList The encoded bitstring
   * @returns Decoded bitstring
   */
  static async decodeBitstring(encodedList: string): Promise<Uint8Array> {
    try {
      // Remove multibase prefix if present
      let base64url = encodedList;
      if (encodedList.startsWith('u')) {
        base64url = encodedList.slice(1);
      }

      // Convert from base64url to base64
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

      // Add padding if needed
      const padding = '='.repeat((4 - (base64.length % 4)) % 4);
      const paddedBase64 = base64 + padding;

      // Decode from base64
      const compressed = Buffer.from(paddedBase64, 'base64');

      // Decompress the bitstring
      const bitstring = await this.decompressBitstring(compressed);

      logger.debug('Decoded bitstring', {
        encodedLength: encodedList.length,
        compressedSize: compressed.length,
        decompressedSize: bitstring.length,
      });

      return bitstring;
    } catch (error) {
      logger.error('Failed to decode bitstring', {
        error,
        encodedList: encodedList.substring(0, 50) + '...',
      });
      throw new Error('Failed to decode bitstring');
    }
  }

  /**
   * Validates bitstring parameters
   * @param totalEntries Total number of entries
   * @param statusSize Size of each status entry in bits
   */
  static validateBitstringParams(
    totalEntries: number,
    statusSize: number
  ): void {
    if (!Number.isInteger(totalEntries) || totalEntries < MIN_BITSTRING_SIZE) {
      throw new Error(
        `Total entries must be an integer >= ${MIN_BITSTRING_SIZE}`
      );
    }

    if (![1, 2, 4, 8].includes(statusSize)) {
      throw new Error('Status size must be 1, 2, 4, or 8 bits');
    }

    const totalBits = totalEntries * statusSize;
    if (totalBits % 8 !== 0) {
      logger.warn('Bitstring size is not byte-aligned', {
        totalEntries,
        statusSize,
        totalBits,
      });
    }
  }

  /**
   * Calculates the capacity of a bitstring
   * @param bitstring The bitstring
   * @param statusSize Size of each status entry in bits
   * @returns Total number of entries the bitstring can hold
   */
  static getBitstringCapacity(
    bitstring: Uint8Array,
    statusSize: number = 1
  ): number {
    const totalBits = bitstring.length * 8;
    return Math.floor(totalBits / statusSize);
  }

  /**
   * Counts the number of set (non-zero) entries in a bitstring
   * @param bitstring The bitstring to analyze
   * @param statusSize Size of each status entry in bits
   * @returns Number of set entries
   */
  static countSetEntries(
    bitstring: Uint8Array,
    statusSize: number = 1
  ): number {
    const capacity = this.getBitstringCapacity(bitstring, statusSize);
    let setCount = 0;

    for (let i = 0; i < capacity; i++) {
      const value = this.getStatusAtIndex(bitstring, i, statusSize);
      if (value !== 0) {
        setCount++;
      }
    }

    return setCount;
  }
}
