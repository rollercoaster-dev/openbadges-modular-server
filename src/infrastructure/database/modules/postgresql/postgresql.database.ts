/**
 * PostgreSQL database implementation for Open Badges API
 *
 * This class implements the DatabaseInterface for PostgreSQL using Drizzle ORM.
 * It provides CRUD operations for Issuers, BadgeClasses, and Assertions.
 */

import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Issuer } from '../../../../domains/issuer/issuer.entity';
import { BadgeClass } from '../../../../domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../../../domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';
import {
  DatabaseInterface,
  DatabaseQueryOptions,
  DatabaseHealth,
  DatabaseHealthError,
} from '../../interfaces/database.interface';
import { issuers, badgeClasses, assertions } from './schema';
import { logger } from '../../../../utils/logging/logger.service';

export class PostgresqlDatabase implements DatabaseInterface {
  private client: postgres.Sql | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private connected: boolean = false;
  private config: Record<string, unknown>;
  private connectionStartedAt: number | null = null;
  private connectionAttempts = 0;
  private lastError: DatabaseHealthError | null = null;

  constructor(config: Record<string, unknown>) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    this.connectionAttempts++;

    try {
      // Validate connection string before creating client
      if (
        typeof this.config['connectionString'] !== 'string' ||
        !this.config['connectionString']
      ) {
        const error = new Error(
          'Invalid or missing PostgreSQL connection string in configuration'
        );
        logger.error(
          'Invalid or missing PostgreSQL connection string in configuration'
        );
        this.lastError = this.toSerializableError(error);
        throw error;
      }

      this.client = postgres(this.config['connectionString']);
      this.db = drizzle(this.client);
      this.connected = true;
      this.connectionStartedAt = Date.now();
      this.lastError = null; // Clear any previous errors on successful connection
    } catch (error) {
      const connectionError =
        error instanceof Error ? error : new Error(String(error));
      this.lastError = this.toSerializableError(connectionError);
      logger.error('Failed to connect to PostgreSQL database', {
        error: connectionError,
      });
      throw connectionError;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.client) return;

    try {
      // Ensure the client exists and has an end method before trying to end the connection
      if (this.client && typeof this.client.end === 'function') {
        await this.client.end();
      }
      this.client = null;
      this.db = null;
      this.connected = false;
      this.connectionStartedAt = null;
    } catch (error) {
      const disconnectionError =
        error instanceof Error ? error : new Error(String(error));
      this.lastError = this.toSerializableError(disconnectionError);
      logger.error('Failed to disconnect from PostgreSQL database', {
        error: disconnectionError,
      });
      throw disconnectionError;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private ensureConnected(): void {
    if (!this.connected || !this.db) {
      throw new Error('Database is not connected');
    }
  }

  /**
   * Converts an Error object to a serializable DatabaseHealthError
   */
  private toSerializableError(error: unknown): DatabaseHealthError {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }
    return {
      message: String(error),
    };
  }

  // Issuer operations
  async createIssuer(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      name,
      url,
      email,
      description,
      image,
      publicKey,
      ...additionalFields
    } = issuer;

    // Create an object with the correct types for Drizzle ORM
    const insertData = {
      name: name as string,
      url: url as string,
      email: email as string | null,
      description: description as string | null,
      image:
        typeof image === 'string'
          ? image
          : image
          ? JSON.stringify(image)
          : undefined,
      publicKey: publicKey ? JSON.stringify(publicKey) : undefined,
      additionalFields:
        Object.keys(additionalFields).length > 0 ? additionalFields : undefined,
    };

    const result = await this.db!.insert(issuers)
      .values(insertData)
      .returning();

    if (!result[0]) {
      throw new Error('Failed to create issuer');
    }

    // Combine the database record with additional fields to form the complete Issuer object
    return Issuer.create({
      id: result[0].id.toString() as Shared.IRI,
      name: result[0].name,
      url: result[0].url as Shared.IRI,
      email: result[0].email,
      description: result[0].description,
      image: result[0].image as Shared.IRI,
      publicKey: result[0].publicKey
        ? JSON.parse(result[0].publicKey as string)
        : undefined,
      ...((result[0].additionalFields as Record<string, unknown>) || {}),
    });
  }

  async getIssuerById(id: Shared.IRI): Promise<Issuer | null> {
    this.ensureConnected();

    const result = await this.db!.select()
      .from(issuers)
      .where(eq(issuers.id, id as string));

    if (!result[0]) {
      return null;
    }

    return Issuer.create({
      id: result[0].id.toString() as Shared.IRI,
      name: result[0].name,
      url: result[0].url as Shared.IRI,
      email: result[0].email,
      description: result[0].description,
      image: result[0].image as Shared.IRI,
      publicKey: result[0].publicKey
        ? JSON.parse(result[0].publicKey as string)
        : undefined,
      ...((result[0].additionalFields as Record<string, unknown>) || {}),
    });
  }

  async updateIssuer(
    id: Shared.IRI,
    issuer: Partial<Issuer>
  ): Promise<Issuer | null> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      name,
      url,
      email,
      description,
      image,
      publicKey,
      ...additionalFields
    } = issuer;

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData['name'] = name;
    if (url !== undefined) updateData['url'] = url as string;
    if (email !== undefined) updateData['email'] = email;
    if (description !== undefined) updateData['description'] = description;
    if (image !== undefined)
      updateData['image'] =
        typeof image === 'string' ? image : JSON.stringify(image);
    if (publicKey !== undefined)
      updateData['publicKey'] = publicKey ? JSON.stringify(publicKey) : null;

    // If there are additional fields, merge them with existing ones
    if (Object.keys(additionalFields).length > 0) {
      const existingIssuer = await this.getIssuerById(id);
      if (!existingIssuer) return null;

      // Use direct property assignment for better performance (O(n) vs O(n²))
      const existingAdditionalFields: Record<string, unknown> = {};
      const standardKeys = [
        'id',
        'name',
        'url',
        'email',
        'description',
        'image',
        'publicKey',
      ];

      for (const [key, value] of Object.entries(existingIssuer)) {
        if (!standardKeys.includes(key)) {
          existingAdditionalFields[key] = value;
        }
      }

      updateData['additionalFields'] = {
        ...existingAdditionalFields,
        ...additionalFields,
      };
    }

    // Add updatedAt timestamp
    updateData['updatedAt'] = new Date();

    const result = await this.db!.update(issuers)
      .set(updateData)
      .where(eq(issuers.id, id as string))
      .returning();

    if (!result[0]) {
      return null;
    }

    return Issuer.create({
      id: result[0].id.toString() as Shared.IRI,
      name: result[0].name,
      url: result[0].url as Shared.IRI,
      email: result[0].email,
      description: result[0].description,
      image: result[0].image as Shared.IRI,
      publicKey: result[0].publicKey
        ? JSON.parse(result[0].publicKey as string)
        : undefined,
      ...((result[0].additionalFields as Record<string, unknown>) || {}),
    });
  }

  async deleteIssuer(id: Shared.IRI): Promise<boolean> {
    this.ensureConnected();

    const result = await this.db!.delete(issuers)
      .where(eq(issuers.id, id as string))
      .returning();
    return result.length > 0;
  }

  // BadgeClass operations
  async createBadgeClass(
    badgeClass: Omit<BadgeClass, 'id'>
  ): Promise<BadgeClass> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      issuer,
      name,
      description,
      image,
      criteria,
      alignment,
      tags,
      ...additionalFields
    } = badgeClass;

    // Ensure issuer exists
    const issuerId = issuer as Shared.IRI;
    const issuerExists = await this.getIssuerById(issuerId);
    if (!issuerExists) {
      throw new Error(`Issuer with ID ${issuerId} does not exist`);
    }

    // Create an object with the correct types for Drizzle ORM
    const insertData = {
      issuerId: issuerId as string,
      name: name as string,
      description: (description || '') as string,
      image:
        typeof image === 'string' ? image : image ? JSON.stringify(image) : '',
      criteria: criteria ? JSON.stringify(criteria) : '{}',
      alignment: alignment ? JSON.stringify(alignment) : undefined,
      tags: tags ? JSON.stringify(tags) : undefined,
      additionalFields:
        Object.keys(additionalFields).length > 0 ? additionalFields : undefined,
    };

    const result = await this.db!.insert(badgeClasses)
      .values(insertData)
      .returning();

    if (!result[0]) {
      throw new Error('Failed to create badge class');
    }

    // Combine the database record with additional fields to form the complete BadgeClass object
    return BadgeClass.create({
      id: result[0].id.toString() as Shared.IRI,
      issuer: issuerId,
      name: result[0].name,
      description: result[0].description,
      image: result[0].image as Shared.IRI,
      criteria: result[0].criteria
        ? JSON.parse(result[0].criteria as string)
        : undefined,
      alignment: result[0].alignment
        ? JSON.parse(result[0].alignment as string)
        : undefined,
      tags: result[0].tags ? JSON.parse(result[0].tags as string) : undefined,
      ...((result[0].additionalFields as Record<string, unknown>) || {}),
    });
  }

  async getBadgeClassById(id: Shared.IRI): Promise<BadgeClass | null> {
    this.ensureConnected();

    const result = await this.db!.select()
      .from(badgeClasses)
      .where(eq(badgeClasses.id, id as string));

    if (!result[0]) {
      return null;
    }

    return BadgeClass.create({
      id: result[0].id.toString() as Shared.IRI,
      issuer: result[0].issuerId.toString() as Shared.IRI,
      name: result[0].name,
      description: result[0].description,
      image: result[0].image as Shared.IRI,
      criteria: result[0].criteria
        ? JSON.parse(result[0].criteria as string)
        : undefined,
      alignment: result[0].alignment
        ? JSON.parse(result[0].alignment as string)
        : undefined,
      tags: result[0].tags ? JSON.parse(result[0].tags as string) : undefined,
      ...((result[0].additionalFields as Record<string, unknown>) || {}),
    });
  }

  async getBadgeClassesByIssuer(
    issuerId: Shared.IRI,
    _options?: DatabaseQueryOptions
  ): Promise<BadgeClass[]> {
    this.ensureConnected();

    const result = await this.db!.select()
      .from(badgeClasses)
      .where(eq(badgeClasses.issuerId, issuerId as string));

    return result.map((record) =>
      BadgeClass.create({
        id: record.id.toString() as Shared.IRI,
        issuer: record.issuerId.toString() as Shared.IRI,
        name: record.name,
        description: record.description,
        image: record.image as Shared.IRI,
        criteria: record.criteria
          ? JSON.parse(record.criteria as string)
          : undefined,
        alignment: record.alignment
          ? JSON.parse(record.alignment as string)
          : undefined,
        tags: record.tags ? JSON.parse(record.tags as string) : undefined,
        ...((record.additionalFields as Record<string, unknown>) || {}),
      })
    );
  }

  async updateBadgeClass(
    id: Shared.IRI,
    badgeClass: Partial<BadgeClass>
  ): Promise<BadgeClass | null> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      issuer,
      name,
      description,
      image,
      criteria,
      alignment,
      tags,
      ...additionalFields
    } = badgeClass;

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData['name'] = name;
    if (description !== undefined) updateData['description'] = description;
    if (image !== undefined)
      updateData['image'] =
        typeof image === 'string' ? image : JSON.stringify(image);
    if (criteria !== undefined)
      updateData['criteria'] = criteria ? JSON.stringify(criteria) : null;
    if (alignment !== undefined)
      updateData['alignment'] = alignment ? JSON.stringify(alignment) : null;
    if (tags !== undefined)
      updateData['tags'] = tags ? JSON.stringify(tags) : null;

    // Update issuer if provided
    if (issuer !== undefined) {
      const issuerId = issuer as Shared.IRI;
      const issuerExists = await this.getIssuerById(issuerId);
      if (!issuerExists) {
        throw new Error(`Issuer with ID ${issuerId} does not exist`);
      }
      updateData['issuerId'] = issuerId as string;
    }

    // If there are additional fields, merge them with existing ones
    if (Object.keys(additionalFields).length > 0) {
      const existingBadgeClass = await this.getBadgeClassById(id);
      if (!existingBadgeClass) return null;

      // Use direct property assignment for better performance (O(n) vs O(n²))
      const existingAdditionalFields: Record<string, unknown> = {};
      const standardKeys = [
        'id',
        'issuer',
        'name',
        'description',
        'image',
        'criteria',
        'alignment',
        'tags',
      ];

      for (const [key, value] of Object.entries(existingBadgeClass)) {
        if (!standardKeys.includes(key)) {
          existingAdditionalFields[key] = value;
        }
      }

      updateData['additionalFields'] = {
        ...existingAdditionalFields,
        ...additionalFields,
      };
    }

    // Add updatedAt timestamp
    updateData['updatedAt'] = new Date();

    const result = await this.db!.update(badgeClasses)
      .set(updateData)
      .where(eq(badgeClasses.id, id as string))
      .returning();

    if (!result[0]) {
      return null;
    }

    return BadgeClass.create({
      id: result[0].id.toString() as Shared.IRI,
      issuer: result[0].issuerId.toString() as Shared.IRI,
      name: result[0].name,
      description: result[0].description,
      image: result[0].image as Shared.IRI,
      criteria: result[0].criteria
        ? JSON.parse(result[0].criteria as string)
        : undefined,
      alignment: result[0].alignment
        ? JSON.parse(result[0].alignment as string)
        : undefined,
      tags: result[0].tags ? JSON.parse(result[0].tags as string) : undefined,
      ...((result[0].additionalFields as Record<string, unknown>) || {}),
    });
  }

  async deleteBadgeClass(id: Shared.IRI): Promise<boolean> {
    this.ensureConnected();

    const result = await this.db!.delete(badgeClasses)
      .where(eq(badgeClasses.id, id as string))
      .returning();
    return result.length > 0;
  }

  // Assertion operations
  async createAssertion(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      badgeClass,
      recipient,
      issuedOn,
      expires,
      evidence,
      verification,
      revoked,
      revocationReason,
      ...additionalFields
    } = assertion;

    // Ensure badge class exists
    const badgeClassId = badgeClass as Shared.IRI;
    const badgeClassExists = await this.getBadgeClassById(badgeClassId);
    if (!badgeClassExists) {
      throw new Error(`Badge class with ID ${badgeClassId} does not exist`);
    }

    // Helper function to safely convert input to Date or undefined
    function safeConvertToDate(value: unknown): Date | undefined {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? undefined : value;
      }
      if (typeof value === 'string' || typeof value === 'number') {
        try {
          const dateObj = new Date(value);
          if (isNaN(dateObj.getTime())) {
            logger.warn(`Invalid date value provided during conversion`, {
              value,
            });
            return undefined;
          }
          return dateObj;
        } catch (error) {
          logger.warn(`Error parsing date value during conversion`, {
            value,
            error,
          });
          return undefined;
        }
      }
      logger.warn(`Unexpected type provided for date conversion`, {
        type: typeof value,
        value,
      });
      return undefined;
    }

    // Safely convert dates before using them
    const finalIssuedOn = safeConvertToDate(issuedOn) ?? new Date(); // Default to now if conversion fails or not provided
    const finalExpires = safeConvertToDate(expires); // Undefined if conversion fails or not provided

    // Create an object with the correct types for Drizzle ORM
    const insertData = {
      badgeClassId: badgeClassId as string,
      recipient: JSON.stringify(recipient),
      issuedOn: finalIssuedOn,
      expires: finalExpires,
      evidence: evidence ? JSON.stringify(evidence) : undefined,
      verification: verification ? JSON.stringify(verification) : undefined,
      revoked: revoked !== undefined ? revoked : undefined,
      revocationReason: revocationReason as string | null,
      additionalFields:
        Object.keys(additionalFields).length > 0 ? additionalFields : undefined,
    };

    const result = await this.db!.insert(assertions)
      .values(insertData)
      .returning();

    if (!result[0]) {
      throw new Error('Failed to create assertion');
    }

    // Combine the database record with additional fields to form the complete Assertion object
    return Assertion.create({
      id: result[0].id.toString() as Shared.IRI,
      badgeClass: badgeClassId,
      recipient: JSON.parse(result[0].recipient as string),
      issuedOn: result[0].issuedOn.toISOString(),
      expires: result[0].expires ? result[0].expires.toISOString() : undefined,
      evidence: result[0].evidence
        ? JSON.parse(result[0].evidence as string)
        : undefined,
      verification: result[0].verification
        ? JSON.parse(result[0].verification as string)
        : undefined,
      revoked:
        result[0].revoked !== null ? Boolean(result[0].revoked) : undefined,
      revocationReason: result[0].revocationReason,
      ...((result[0].additionalFields as Record<string, unknown>) || {}),
    });
  }

  async getAssertionById(id: Shared.IRI): Promise<Assertion | null> {
    this.ensureConnected();

    const result = await this.db!.select()
      .from(assertions)
      .where(eq(assertions.id, id as string));

    if (!result[0]) {
      return null;
    }

    return Assertion.create({
      id: result[0].id.toString() as Shared.IRI,
      badgeClass: result[0].badgeClassId.toString() as Shared.IRI,
      recipient: JSON.parse(result[0].recipient as string),
      issuedOn: result[0].issuedOn.toISOString(),
      expires: result[0].expires ? result[0].expires.toISOString() : undefined,
      evidence: result[0].evidence
        ? JSON.parse(result[0].evidence as string)
        : undefined,
      verification: result[0].verification
        ? JSON.parse(result[0].verification as string)
        : undefined,
      revoked:
        result[0].revoked !== null ? Boolean(result[0].revoked) : undefined,
      revocationReason: result[0].revocationReason,
      ...((result[0].additionalFields as Record<string, unknown>) || {}),
    });
  }

  async getAssertionsByBadgeClass(
    badgeClassId: Shared.IRI,
    _options?: DatabaseQueryOptions
  ): Promise<Assertion[]> {
    this.ensureConnected();

    const result = await this.db!.select()
      .from(assertions)
      .where(eq(assertions.badgeClassId, badgeClassId as string));

    return result.map((record) =>
      Assertion.create({
        id: record.id.toString() as Shared.IRI,
        badgeClass: record.badgeClassId.toString() as Shared.IRI,
        recipient: JSON.parse(record.recipient as string),
        issuedOn: record.issuedOn.toISOString(),
        expires: record.expires ? record.expires.toISOString() : undefined,
        evidence: record.evidence
          ? JSON.parse(record.evidence as string)
          : undefined,
        verification: record.verification
          ? JSON.parse(record.verification as string)
          : undefined,
        revoked: record.revoked !== null ? Boolean(record.revoked) : undefined,
        revocationReason: record.revocationReason,
        ...((record.additionalFields as Record<string, unknown>) || {}),
      })
    );
  }

  async getAssertionsByRecipient(
    recipientId: string,
    options?: DatabaseQueryOptions
  ): Promise<Assertion[]> {
    this.ensureConnected();

    // Extract pagination parameters with defaults
    const { limit = 50, offset = 0 } = options?.pagination ?? {};

    // Validate pagination parameters
    if (limit <= 0 || limit > 1000) {
      throw new Error(`Invalid limit: ${limit}. Must be between 1 and 1000.`);
    }
    if (offset < 0) {
      throw new Error(`Invalid offset: ${offset}. Must be 0 or greater.`);
    }

    // Use PostgreSQL JSON operators to query directly instead of full table scan
    // Handle different recipient identity formats (both 'identity' and 'id' fields)
    const result = await this.db!.select()
      .from(assertions)
      .where(
        sql`(${assertions.recipient}->>'identity' = ${recipientId}) OR (${assertions.recipient}->>'id' = ${recipientId})`
      )
      .limit(limit)
      .offset(offset);

    return result.map((record) =>
      Assertion.create({
        id: record.id.toString() as Shared.IRI,
        badgeClass: record.badgeClassId.toString() as Shared.IRI,
        recipient: JSON.parse(record.recipient as string),
        issuedOn: record.issuedOn.toISOString(),
        expires: record.expires ? record.expires.toISOString() : undefined,
        evidence: record.evidence
          ? JSON.parse(record.evidence as string)
          : undefined,
        verification: record.verification
          ? JSON.parse(record.verification as string)
          : undefined,
        revoked: record.revoked !== null ? Boolean(record.revoked) : undefined,
        revocationReason: record.revocationReason,
        ...((record.additionalFields as Record<string, unknown>) || {}),
      })
    );
  }

  async updateAssertion(
    id: Shared.IRI,
    assertion: Partial<Assertion>
  ): Promise<Assertion | null> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      badgeClass,
      recipient,
      issuedOn,
      expires,
      evidence,
      verification,
      revoked,
      revocationReason,
      ...additionalFields
    } = assertion;

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (recipient !== undefined)
      updateData['recipient'] = JSON.stringify(recipient);
    if (issuedOn !== undefined) updateData['issuedOn'] = new Date(issuedOn);
    if (expires !== undefined)
      updateData['expires'] = expires ? new Date(expires) : null;
    if (evidence !== undefined)
      updateData['evidence'] = evidence ? JSON.stringify(evidence) : null;
    if (verification !== undefined)
      updateData['verification'] = verification
        ? JSON.stringify(verification)
        : null;
    if (revoked !== undefined) updateData['revoked'] = revoked;
    if (revocationReason !== undefined)
      updateData['revocationReason'] = revocationReason;

    // Update badge class if provided
    if (badgeClass !== undefined) {
      const badgeClassId = badgeClass as Shared.IRI;
      const badgeClassExists = await this.getBadgeClassById(badgeClassId);
      if (!badgeClassExists) {
        throw new Error(`Badge class with ID ${badgeClassId} does not exist`);
      }
      updateData['badgeClassId'] = badgeClassId as string;
    }

    // If there are additional fields, merge them with existing ones
    if (Object.keys(additionalFields).length > 0) {
      const existingAssertion = await this.getAssertionById(id);
      if (!existingAssertion) return null;

      // Use direct property assignment for better performance (O(n) vs O(n²))
      const existingAdditionalFields: Record<string, unknown> = {};
      const standardKeys = [
        'id',
        'badgeClass',
        'recipient',
        'issuedOn',
        'expires',
        'evidence',
        'verification',
        'revoked',
        'revocationReason',
      ];

      for (const [key, value] of Object.entries(existingAssertion)) {
        if (!standardKeys.includes(key)) {
          existingAdditionalFields[key] = value;
        }
      }

      updateData['additionalFields'] = {
        ...existingAdditionalFields,
        ...additionalFields,
      };
    }

    // Add updatedAt timestamp
    updateData['updatedAt'] = new Date();

    const result = await this.db!.update(assertions)
      .set(updateData)
      .where(eq(assertions.id, id as string))
      .returning();

    if (!result[0]) {
      return null;
    }

    return Assertion.create({
      id: result[0].id.toString() as Shared.IRI,
      badgeClass: result[0].badgeClassId.toString() as Shared.IRI,
      recipient: JSON.parse(result[0].recipient as string),
      issuedOn: result[0].issuedOn.toISOString(),
      expires: result[0].expires ? result[0].expires.toISOString() : undefined,
      evidence: result[0].evidence
        ? JSON.parse(result[0].evidence as string)
        : undefined,
      verification: result[0].verification
        ? JSON.parse(result[0].verification as string)
        : undefined,
      revoked:
        result[0].revoked !== null ? Boolean(result[0].revoked) : undefined,
      revocationReason: result[0].revocationReason,
      ...((result[0].additionalFields as Record<string, unknown>) || {}),
    });
  }

  async deleteAssertion(id: Shared.IRI): Promise<boolean> {
    this.ensureConnected();

    const result = await this.db!.delete(assertions)
      .where(eq(assertions.id, id as string))
      .returning();
    return result.length > 0;
  }

  // Missing interface methods
  async getAllIssuers(options?: DatabaseQueryOptions): Promise<Issuer[]> {
    this.ensureConnected();

    // Extract pagination parameters with defaults
    const { limit = 50, offset = 0 } = options?.pagination ?? {};

    // Validate pagination parameters
    if (limit <= 0 || limit > 1000) {
      throw new Error(`Invalid limit: ${limit}. Must be between 1 and 1000.`);
    }
    if (offset < 0) {
      throw new Error(`Invalid offset: ${offset}. Must be 0 or greater.`);
    }

    const result = await this.db!.select()
      .from(issuers)
      .limit(limit)
      .offset(offset);

    return result.map((record) =>
      Issuer.create({
        id: record.id.toString() as Shared.IRI,
        name: record.name,
        url: record.url as Shared.IRI,
        email: record.email,
        description: record.description,
        image: record.image as Shared.IRI,
        publicKey: record.publicKey
          ? JSON.parse(record.publicKey as string)
          : undefined,
        ...((record.additionalFields as Record<string, unknown>) || {}),
      })
    );
  }

  async getAllBadgeClasses(
    options?: DatabaseQueryOptions
  ): Promise<BadgeClass[]> {
    this.ensureConnected();

    // Extract pagination parameters with defaults
    const { limit = 50, offset = 0 } = options?.pagination ?? {};

    // Validate pagination parameters
    if (limit <= 0 || limit > 1000) {
      throw new Error(`Invalid limit: ${limit}. Must be between 1 and 1000.`);
    }
    if (offset < 0) {
      throw new Error(`Invalid offset: ${offset}. Must be 0 or greater.`);
    }

    const result = await this.db!.select()
      .from(badgeClasses)
      .limit(limit)
      .offset(offset);

    return result.map((record) =>
      BadgeClass.create({
        id: record.id.toString() as Shared.IRI,
        issuer: record.issuerId.toString() as Shared.IRI,
        name: record.name,
        description: record.description,
        image: record.image as Shared.IRI,
        criteria: record.criteria
          ? JSON.parse(record.criteria as string)
          : undefined,
        alignment: record.alignment
          ? JSON.parse(record.alignment as string)
          : undefined,
        tags: record.tags ? JSON.parse(record.tags as string) : undefined,
        ...((record.additionalFields as Record<string, unknown>) || {}),
      })
    );
  }

  async getAllAssertions(options?: DatabaseQueryOptions): Promise<Assertion[]> {
    this.ensureConnected();

    // Extract pagination parameters with defaults
    const { limit = 50, offset = 0 } = options?.pagination ?? {};

    // Validate pagination parameters
    if (limit <= 0 || limit > 1000) {
      throw new Error(`Invalid limit: ${limit}. Must be between 1 and 1000.`);
    }
    if (offset < 0) {
      throw new Error(`Invalid offset: ${offset}. Must be 0 or greater.`);
    }

    const result = await this.db!.select()
      .from(assertions)
      .limit(limit)
      .offset(offset);

    return result.map((record) =>
      Assertion.create({
        id: record.id.toString() as Shared.IRI,
        badgeClass: record.badgeClassId.toString() as Shared.IRI,
        recipient: JSON.parse(record.recipient as string),
        issuedOn: record.issuedOn.toISOString(),
        expires: record.expires ? record.expires.toISOString() : undefined,
        evidence: record.evidence
          ? JSON.parse(record.evidence as string)
          : undefined,
        verification: record.verification
          ? JSON.parse(record.verification as string)
          : undefined,
        revoked: record.revoked !== null ? Boolean(record.revoked) : undefined,
        revocationReason: record.revocationReason,
        ...((record.additionalFields as Record<string, unknown>) || {}),
      })
    );
  }

  async close(): Promise<void> {
    return this.disconnect();
  }

  async getHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();
    let connected = false;
    let responseTime = 0;

    try {
      if (this.connected && this.db) {
        // Test basic connection
        await this.db.select().from(issuers).limit(1);
        connected = true;
      }
      responseTime = Date.now() - startTime;
    } catch (error) {
      responseTime = Date.now() - startTime;
      // Update last error if health check fails
      this.lastError = this.toSerializableError(error);
    }

    // Calculate actual uptime in milliseconds since connection started
    const uptime =
      this.connectionStartedAt && connected
        ? Date.now() - this.connectionStartedAt
        : 0;

    return {
      connected,
      responseTime,
      uptime, // Now returns elapsed time since connection, not current epoch
      connectionAttempts: this.connectionAttempts, // Now returns actual attempt count
      lastError: this.lastError,
      configuration: this.config,
    };
  }

  getConfiguration(): Record<string, unknown> {
    return {
      module: 'postgresql',
      connected: this.connected,
      ...this.config,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      if (!this.connected || !this.db) {
        return false;
      }
      await this.db.select().from(issuers).limit(1);
      return true;
    } catch {
      return false;
    }
  }

  getModuleName(): string {
    return 'postgresql';
  }
}
