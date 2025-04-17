/**
 * PostgreSQL database implementation for Open Badges API
 *
 * This class implements the DatabaseInterface for PostgreSQL using Drizzle ORM.
 * It provides CRUD operations for Issuers, BadgeClasses, and Assertions.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Issuer } from '../../../../domains/issuer/issuer.entity';
import { BadgeClass } from '../../../../domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../../../domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';
import { DatabaseInterface } from '../../interfaces/database.interface';
import { issuers, badgeClasses, assertions } from './schema';

export class PostgresqlDatabase implements DatabaseInterface {
  private client: postgres.Sql | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private connected: boolean = false;
  private config: Record<string, any>;

  constructor(config: Record<string, any>) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.client = postgres(this.config.connectionString);
      this.db = drizzle(this.client);
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect to PostgreSQL database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.client) return;

    try {
      await this.client.end();
      this.client = null;
      this.db = null;
      this.connected = false;
    } catch (error) {
      console.error('Failed to disconnect from PostgreSQL database:', error);
      throw error;
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

  // Issuer operations
  async createIssuer(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const { name, url, email, description, image, publicKey, ...additionalFields } = issuer;

    // Create an object with the correct types for Drizzle ORM
    // Using any type to bypass TypeScript's strict checking
    const insertData: any = {
      name: name,
      url: url as string,
      email: email,
      description: description,
      image: typeof image === 'string' ? image : image ? JSON.stringify(image) : undefined,
      publicKey: publicKey ? JSON.stringify(publicKey) : undefined,
      additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined
    };

    const result = await this.db!.insert(issuers).values(insertData).returning();

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
      publicKey: result[0].publicKey ? JSON.parse(result[0].publicKey as string) : undefined,
      ...(result[0].additionalFields as Record<string, unknown> || {})
    });
  }

  async getIssuerById(id: Shared.IRI): Promise<Issuer | null> {
    this.ensureConnected();

    const result = await this.db!.select().from(issuers).where(eq(issuers.id, id as string));

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
      publicKey: result[0].publicKey ? JSON.parse(result[0].publicKey as string) : undefined,
      ...(result[0].additionalFields as Record<string, unknown> || {})
    });
  }

  async updateIssuer(id: Shared.IRI, issuer: Partial<Issuer>): Promise<Issuer | null> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const { name, url, email, description, image, publicKey, ...additionalFields } = issuer;

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url as string;
    if (email !== undefined) updateData.email = email;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = typeof image === 'string' ? image : JSON.stringify(image);
    if (publicKey !== undefined) updateData.publicKey = publicKey ? JSON.stringify(publicKey) : null;

    // If there are additional fields, merge them with existing ones
    if (Object.keys(additionalFields).length > 0) {
      const existingIssuer = await this.getIssuerById(id);
      if (!existingIssuer) return null;

      const existingAdditionalFields = Object.entries(existingIssuer)
        .filter(([key]) => !['id', 'name', 'url', 'email', 'description', 'image', 'publicKey'].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {} as Record<string, unknown>);

      updateData.additionalFields = { ...existingAdditionalFields, ...additionalFields };
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

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
      publicKey: result[0].publicKey ? JSON.parse(result[0].publicKey as string) : undefined,
      ...(result[0].additionalFields as Record<string, unknown> || {})
    });
  }

  async deleteIssuer(id: Shared.IRI): Promise<boolean> {
    this.ensureConnected();

    const result = await this.db!.delete(issuers).where(eq(issuers.id, id as string)).returning();
    return result.length > 0;
  }

  // BadgeClass operations
  async createBadgeClass(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      issuer, name, description, image, criteria,
      alignment, tags, ...additionalFields
    } = badgeClass;

    // Ensure issuer exists
    const issuerId = issuer as Shared.IRI;
    const issuerExists = await this.getIssuerById(issuerId);
    if (!issuerExists) {
      throw new Error(`Issuer with ID ${issuerId} does not exist`);
    }

    // Using any type to bypass TypeScript's strict checking
    const insertData: any = {
      issuerId: issuerId as string,
      name: name,
      description: description || '',
      image: typeof image === 'string' ? image : image ? JSON.stringify(image) : '',
      criteria: criteria ? JSON.stringify(criteria) : '{}',
      alignment: alignment ? JSON.stringify(alignment) : undefined,
      tags: tags ? JSON.stringify(tags) : undefined,
      additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined
    };

    const result = await this.db!.insert(badgeClasses).values(insertData).returning();

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
      criteria: result[0].criteria ? JSON.parse(result[0].criteria as string) : undefined,
      alignment: result[0].alignment ? JSON.parse(result[0].alignment as string) : undefined,
      tags: result[0].tags ? JSON.parse(result[0].tags as string) : undefined,
      ...(result[0].additionalFields as Record<string, unknown> || {})
    });
  }

  async getBadgeClassById(id: Shared.IRI): Promise<BadgeClass | null> {
    this.ensureConnected();

    const result = await this.db!.select().from(badgeClasses).where(eq(badgeClasses.id, id as string));

    if (!result[0]) {
      return null;
    }

    return BadgeClass.create({
      id: result[0].id.toString() as Shared.IRI,
      issuer: result[0].issuerId.toString() as Shared.IRI,
      name: result[0].name,
      description: result[0].description,
      image: result[0].image as Shared.IRI,
      criteria: result[0].criteria ? JSON.parse(result[0].criteria as string) : undefined,
      alignment: result[0].alignment ? JSON.parse(result[0].alignment as string) : undefined,
      tags: result[0].tags ? JSON.parse(result[0].tags as string) : undefined,
      ...(result[0].additionalFields as Record<string, unknown> || {})
    });
  }

  async getBadgeClassesByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    this.ensureConnected();

    const result = await this.db!.select().from(badgeClasses).where(eq(badgeClasses.issuerId, issuerId as string));

    return result.map(record => BadgeClass.create({
      id: record.id.toString() as Shared.IRI,
      issuer: record.issuerId.toString() as Shared.IRI,
      name: record.name,
      description: record.description,
      image: record.image as Shared.IRI,
      criteria: record.criteria ? JSON.parse(record.criteria as string) : undefined,
      alignment: record.alignment ? JSON.parse(record.alignment as string) : undefined,
      tags: record.tags ? JSON.parse(record.tags as string) : undefined,
      ...(record.additionalFields as Record<string, unknown> || {})
    }));
  }

  async updateBadgeClass(id: Shared.IRI, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      issuer, name, description, image, criteria,
      alignment, tags, ...additionalFields
    } = badgeClass;

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = typeof image === 'string' ? image : JSON.stringify(image);
    if (criteria !== undefined) updateData.criteria = criteria ? JSON.stringify(criteria) : null;
    if (alignment !== undefined) updateData.alignment = alignment ? JSON.stringify(alignment) : null;
    if (tags !== undefined) updateData.tags = tags ? JSON.stringify(tags) : null;

    // Update issuer if provided
    if (issuer !== undefined) {
      const issuerId = issuer as Shared.IRI;
      const issuerExists = await this.getIssuerById(issuerId);
      if (!issuerExists) {
        throw new Error(`Issuer with ID ${issuerId} does not exist`);
      }
      updateData.issuerId = issuerId as string;
    }

    // If there are additional fields, merge them with existing ones
    if (Object.keys(additionalFields).length > 0) {
      const existingBadgeClass = await this.getBadgeClassById(id);
      if (!existingBadgeClass) return null;

      const existingAdditionalFields = Object.entries(existingBadgeClass)
        .filter(([key]) => !['id', 'issuer', 'name', 'description', 'image', 'criteria', 'alignment', 'tags'].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {} as Record<string, unknown>);

      updateData.additionalFields = { ...existingAdditionalFields, ...additionalFields };
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

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
      criteria: result[0].criteria ? JSON.parse(result[0].criteria as string) : undefined,
      alignment: result[0].alignment ? JSON.parse(result[0].alignment as string) : undefined,
      tags: result[0].tags ? JSON.parse(result[0].tags as string) : undefined,
      ...(result[0].additionalFields as Record<string, unknown> || {})
    });
  }

  async deleteBadgeClass(id: Shared.IRI): Promise<boolean> {
    this.ensureConnected();

    const result = await this.db!.delete(badgeClasses).where(eq(badgeClasses.id, id as string)).returning();
    return result.length > 0;
  }

  // Assertion operations
  async createAssertion(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      badgeClass, recipient, issuedOn, expires,
      evidence, verification, revoked, revocationReason,
      ...additionalFields
    } = assertion;

    // Ensure badge class exists
    const badgeClassId = badgeClass as Shared.IRI;
    const badgeClassExists = await this.getBadgeClassById(badgeClassId);
    if (!badgeClassExists) {
      throw new Error(`Badge class with ID ${badgeClassId} does not exist`);
    }

    // Using any type to bypass TypeScript's strict checking
    const insertData: any = {
      badgeClassId: badgeClassId as string,
      recipient: JSON.stringify(recipient),
      issuedOn: issuedOn ? new Date(issuedOn) : new Date(),
      expires: expires ? new Date(expires) : undefined,
      evidence: evidence ? JSON.stringify(evidence) : undefined,
      verification: verification ? JSON.stringify(verification) : undefined,
      revoked: revoked !== undefined ? revoked : undefined,
      revocationReason: revocationReason,
      additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined
    };

    const result = await this.db!.insert(assertions).values(insertData).returning();

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
      evidence: result[0].evidence ? JSON.parse(result[0].evidence as string) : undefined,
      verification: result[0].verification ? JSON.parse(result[0].verification as string) : undefined,
      revoked: result[0].revoked !== null ? Boolean(result[0].revoked) : undefined,
      revocationReason: result[0].revocationReason,
      ...(result[0].additionalFields as Record<string, unknown> || {})
    });
  }

  async getAssertionById(id: Shared.IRI): Promise<Assertion | null> {
    this.ensureConnected();

    const result = await this.db!.select().from(assertions).where(eq(assertions.id, id as string));

    if (!result[0]) {
      return null;
    }

    return Assertion.create({
      id: result[0].id.toString() as Shared.IRI,
      badgeClass: result[0].badgeClassId.toString() as Shared.IRI,
      recipient: JSON.parse(result[0].recipient as string),
      issuedOn: result[0].issuedOn.toISOString(),
      expires: result[0].expires ? result[0].expires.toISOString() : undefined,
      evidence: result[0].evidence ? JSON.parse(result[0].evidence as string) : undefined,
      verification: result[0].verification ? JSON.parse(result[0].verification as string) : undefined,
      revoked: result[0].revoked !== null ? Boolean(result[0].revoked) : undefined,
      revocationReason: result[0].revocationReason,
      ...(result[0].additionalFields as Record<string, unknown> || {})
    });
  }

  async getAssertionsByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]> {
    this.ensureConnected();

    const result = await this.db!.select().from(assertions).where(eq(assertions.badgeClassId, badgeClassId as string));

    return result.map(record => Assertion.create({
      id: record.id.toString() as Shared.IRI,
      badgeClass: record.badgeClassId.toString() as Shared.IRI,
      recipient: JSON.parse(record.recipient as string),
      issuedOn: record.issuedOn.toISOString(),
      expires: record.expires ? record.expires.toISOString() : undefined,
      evidence: record.evidence ? JSON.parse(record.evidence as string) : undefined,
      verification: record.verification ? JSON.parse(record.verification as string) : undefined,
      revoked: record.revoked !== null ? Boolean(record.revoked) : undefined,
      revocationReason: record.revocationReason,
      ...(record.additionalFields as Record<string, unknown> || {})
    }));
  }

  async getAssertionsByRecipient(recipientId: string): Promise<Assertion[]> {
    this.ensureConnected();

    // This is a simplified implementation that needs to be updated to handle different recipient identity formats
    // For now, we'll do a full scan and filter in memory
    const allAssertions = await this.db!.select().from(assertions);

    // Filter assertions where the recipient identity matches the provided ID
    const matchingAssertions = allAssertions.filter(record => {
      try {
        const recipient = JSON.parse(record.recipient as string);
        return recipient.identity === recipientId;
      } catch {
        return false;
      }
    });

    return matchingAssertions.map(record => Assertion.create({
      id: record.id.toString() as Shared.IRI,
      badgeClass: record.badgeClassId.toString() as Shared.IRI,
      recipient: JSON.parse(record.recipient as string),
      issuedOn: record.issuedOn.toISOString(),
      expires: record.expires ? record.expires.toISOString() : undefined,
      evidence: record.evidence ? JSON.parse(record.evidence as string) : undefined,
      verification: record.verification ? JSON.parse(record.verification as string) : undefined,
      revoked: record.revoked !== null ? Boolean(record.revoked) : undefined,
      revocationReason: record.revocationReason,
      ...(record.additionalFields as Record<string, unknown> || {})
    }));
  }

  async updateAssertion(id: Shared.IRI, assertion: Partial<Assertion>): Promise<Assertion | null> {
    this.ensureConnected();

    // Extract fields that are part of the schema
    const {
      badgeClass, recipient, issuedOn, expires,
      evidence, verification, revoked, revocationReason,
      ...additionalFields
    } = assertion;

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (recipient !== undefined) updateData.recipient = JSON.stringify(recipient);
    if (issuedOn !== undefined) updateData.issuedOn = new Date(issuedOn);
    if (expires !== undefined) updateData.expires = expires ? new Date(expires) : null;
    if (evidence !== undefined) updateData.evidence = evidence ? JSON.stringify(evidence) : null;
    if (verification !== undefined) updateData.verification = verification ? JSON.stringify(verification) : null;
    if (revoked !== undefined) updateData.revoked = revoked;
    if (revocationReason !== undefined) updateData.revocationReason = revocationReason;

    // Update badge class if provided
    if (badgeClass !== undefined) {
      const badgeClassId = badgeClass as Shared.IRI;
      const badgeClassExists = await this.getBadgeClassById(badgeClassId);
      if (!badgeClassExists) {
        throw new Error(`Badge class with ID ${badgeClassId} does not exist`);
      }
      updateData.badgeClassId = badgeClassId as string;
    }

    // If there are additional fields, merge them with existing ones
    if (Object.keys(additionalFields).length > 0) {
      const existingAssertion = await this.getAssertionById(id);
      if (!existingAssertion) return null;

      const existingAdditionalFields = Object.entries(existingAssertion)
        .filter(([key]) => !['id', 'badgeClass', 'recipient', 'issuedOn', 'expires', 'evidence', 'verification', 'revoked', 'revocationReason'].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {} as Record<string, unknown>);

      updateData.additionalFields = { ...existingAdditionalFields, ...additionalFields };
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

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
      evidence: result[0].evidence ? JSON.parse(result[0].evidence as string) : undefined,
      verification: result[0].verification ? JSON.parse(result[0].verification as string) : undefined,
      revoked: result[0].revoked !== null ? Boolean(result[0].revoked) : undefined,
      revocationReason: result[0].revocationReason,
      ...(result[0].additionalFields as Record<string, unknown> || {})
    });
  }

  async deleteAssertion(id: Shared.IRI): Promise<boolean> {
    this.ensureConnected();

    const result = await this.db!.delete(assertions).where(eq(assertions.id, id as string)).returning();
    return result.length > 0;
  }
}
