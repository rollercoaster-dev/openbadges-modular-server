/**
 * PostgreSQL database implementation for Open Badges API
 * 
 * This class implements the DatabaseInterface for PostgreSQL using Drizzle ORM.
 * It provides CRUD operations for Issuers, BadgeClasses, and Assertions.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Issuer, BadgeClass, Assertion } from 'openbadges-types';
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
    
    const result = await this.db!.insert(issuers).values({
      name,
      url,
      email,
      description,
      image,
      publicKey,
      additionalFields: additionalFields as any
    }).returning();
    
    if (!result[0]) {
      throw new Error('Failed to create issuer');
    }
    
    // Combine the database record with additional fields to form the complete Issuer object
    return {
      id: result[0].id.toString(),
      name: result[0].name,
      url: result[0].url,
      email: result[0].email,
      description: result[0].description,
      image: result[0].image,
      publicKey: result[0].publicKey as any,
      ...result[0].additionalFields as any
    };
  }

  async getIssuerById(id: string): Promise<Issuer | null> {
    this.ensureConnected();
    
    const result = await this.db!.select().from(issuers).where(eq(issuers.id, id));
    
    if (!result[0]) {
      return null;
    }
    
    return {
      id: result[0].id.toString(),
      name: result[0].name,
      url: result[0].url,
      email: result[0].email,
      description: result[0].description,
      image: result[0].image,
      publicKey: result[0].publicKey as any,
      ...result[0].additionalFields as any
    };
  }

  async updateIssuer(id: string, issuer: Partial<Issuer>): Promise<Issuer | null> {
    this.ensureConnected();
    
    // Extract fields that are part of the schema
    const { name, url, email, description, image, publicKey, ...additionalFields } = issuer;
    
    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (email !== undefined) updateData.email = email;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (publicKey !== undefined) updateData.publicKey = publicKey;
    
    // If there are additional fields, merge them with existing ones
    if (Object.keys(additionalFields).length > 0) {
      const existingIssuer = await this.getIssuerById(id);
      if (!existingIssuer) return null;
      
      const existingAdditionalFields = Object.entries(existingIssuer)
        .filter(([key]) => !['id', 'name', 'url', 'email', 'description', 'image', 'publicKey'].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      updateData.additionalFields = { ...existingAdditionalFields, ...additionalFields };
    }
    
    // Add updatedAt timestamp
    updateData.updatedAt = new Date();
    
    const result = await this.db!.update(issuers)
      .set(updateData)
      .where(eq(issuers.id, id))
      .returning();
    
    if (!result[0]) {
      return null;
    }
    
    return {
      id: result[0].id.toString(),
      name: result[0].name,
      url: result[0].url,
      email: result[0].email,
      description: result[0].description,
      image: result[0].image,
      publicKey: result[0].publicKey as any,
      ...result[0].additionalFields as any
    };
  }

  async deleteIssuer(id: string): Promise<boolean> {
    this.ensureConnected();
    
    const result = await this.db!.delete(issuers).where(eq(issuers.id, id)).returning();
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
    const issuerId = typeof issuer === 'string' ? issuer : issuer.id;
    const issuerExists = await this.getIssuerById(issuerId);
    if (!issuerExists) {
      throw new Error(`Issuer with ID ${issuerId} does not exist`);
    }
    
    const result = await this.db!.insert(badgeClasses).values({
      issuerId,
      name,
      description,
      image,
      criteria: criteria as any,
      alignment: alignment as any,
      tags: tags as any,
      additionalFields: additionalFields as any
    }).returning();
    
    if (!result[0]) {
      throw new Error('Failed to create badge class');
    }
    
    // Combine the database record with additional fields to form the complete BadgeClass object
    return {
      id: result[0].id.toString(),
      issuer: issuerId,
      name: result[0].name,
      description: result[0].description,
      image: result[0].image,
      criteria: result[0].criteria as any,
      alignment: result[0].alignment as any,
      tags: result[0].tags as any,
      ...result[0].additionalFields as any
    };
  }

  async getBadgeClassById(id: string): Promise<BadgeClass | null> {
    this.ensureConnected();
    
    const result = await this.db!.select().from(badgeClasses).where(eq(badgeClasses.id, id));
    
    if (!result[0]) {
      return null;
    }
    
    return {
      id: result[0].id.toString(),
      issuer: result[0].issuerId.toString(),
      name: result[0].name,
      description: result[0].description,
      image: result[0].image,
      criteria: result[0].criteria as any,
      alignment: result[0].alignment as any,
      tags: result[0].tags as any,
      ...result[0].additionalFields as any
    };
  }

  async getBadgeClassesByIssuer(issuerId: string): Promise<BadgeClass[]> {
    this.ensureConnected();
    
    const result = await this.db!.select().from(badgeClasses).where(eq(badgeClasses.issuerId, issuerId));
    
    return result.map(record => ({
      id: record.id.toString(),
      issuer: record.issuerId.toString(),
      name: record.name,
      description: record.description,
      image: record.image,
      criteria: record.criteria as any,
      alignment: record.alignment as any,
      tags: record.tags as any,
      ...record.additionalFields as any
    }));
  }

  async updateBadgeClass(id: string, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null> {
    this.ensureConnected();
    
    // Extract fields that are part of the schema
    const { 
      issuer, name, description, image, criteria, 
      alignment, tags, ...additionalFields 
    } = badgeClass;
    
    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (criteria !== undefined) updateData.criteria = criteria;
    if (alignment !== undefined) updateData.alignment = alignment;
    if (tags !== undefined) updateData.tags = tags;
    
    // Update issuer if provided
    if (issuer !== undefined) {
      const issuerId = typeof issuer === 'string' ? issuer : issuer.id;
      const issuerExists = await this.getIssuerById(issuerId);
      if (!issuerExists) {
        throw new Error(`Issuer with ID ${issuerId} does not exist`);
      }
      updateData.issuerId = issuerId;
    }
    
    // If there are additional fields, merge them with existing ones
    if (Object.keys(additionalFields).length > 0) {
      const existingBadgeClass = await this.getBadgeClassById(id);
      if (!existingBadgeClass) return null;
      
      const existingAdditionalFields = Object.entries(existingBadgeClass)
        .filter(([key]) => !['id', 'issuer', 'name', 'description', 'image', 'criteria', 'alignment', 'tags'].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      updateData.additionalFields = { ...existingAdditionalFields, ...additionalFields };
    }
    
    // Add updatedAt timestamp
    updateData.updatedAt = new Date();
    
    const result = await this.db!.update(badgeClasses)
      .set(updateData)
      .where(eq(badgeClasses.id, id))
      .returning();
    
    if (!result[0]) {
      return null;
    }
    
    return {
      id: result[0].id.toString(),
      issuer: result[0].issuerId.toString(),
      name: result[0].name,
      description: result[0].description,
      image: result[0].image,
      criteria: result[0].criteria as any,
      alignment: result[0].alignment as any,
      tags: result[0].tags as any,
      ...result[0].additionalFields as any
    };
  }

  async deleteBadgeClass(id: string): Promise<boolean> {
    this.ensureConnected();
    
    const result = await this.db!.delete(badgeClasses).where(eq(badgeClasses.id, id)).returning();
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
    const badgeClassId = typeof badgeClass === 'string' ? badgeClass : badgeClass.id;
    const badgeClassExists = await this.getBadgeClassById(badgeClassId);
    if (!badgeClassExists) {
      throw new Error(`Badge class with ID ${badgeClassId} does not exist`);
    }
    
    const result = await this.db!.insert(assertions).values({
      badgeClassId,
      recipient: recipient as any,
      issuedOn: issuedOn ? new Date(issuedOn) : new Date(),
      expires: expires ? new Date(expires) : null,
      evidence: evidence as any,
      verification: verification as any,
      revoked: revoked as any,
      revocationReason,
      additionalFields: additionalFields as any
    }).returning();
    
    if (!result[0]) {
      throw new Error('Failed to create assertion');
    }
    
    // Combine the database record with additional fields to form the complete Assertion object
    return {
      id: result[0].id.toString(),
      badgeClass: badgeClassId,
      recipient: result[0].recipient as any,
      issuedOn: result[0].issuedOn.toISOString(),
      expires: result[0].expires ? result[0].expires.toISOString() : undefined,
      evidence: result[0].evidence as any,
      verification: result[0].verification as any,
      revoked: result[0].revoked as any,
      revocationReason: result[0].revocationReason,
      ...result[0].additionalFields as any
    };
  }

  async getAssertionById(id: string): Promise<Assertion | null> {
    this.ensureConnected();
    
    const result = await this.db!.select().from(assertions).where(eq(assertions.id, id));
    
    if (!result[0]) {
      return null;
    }
    
    return {
      id: result[0].id.toString(),
      badgeClass: result[0].badgeClassId.toString(),
      recipient: result[0].recipient as any,
      issuedOn: result[0].issuedOn.toISOString(),
      expires: result[0].expires ? result[0].expires.toISOString() : undefined,
      evidence: result[0].evidence as any,
      verification: result[0].verification as any,
      revoked: result[0].revoked as any,
      revocationReason: result[0].revocationReason,
      ...result[0].additionalFields as any
    };
  }

  async getAssertionsByBadgeClass(badgeClassId: string): Promise<Assertion[]> {
    this.ensureConnected();
    
    const result = await this.db!.select().from(assertions).where(eq(assertions.badgeClassId, badgeClassId));
    
    return result.map(record => ({
      id: record.id.toString(),
      badgeClass: record.badgeClassId.toString(),
      recipient: record.recipient as any,
      issuedOn: record.issuedOn.toISOString(),
      expires: record.expires ? record.expires.toISOString() : undefined,
      evidence: record.evidence as any,
      verification: record.verification as any,
      revoked: record.revoked as any,
      revocationReason: record.revocationReason,
      ...record.additionalFields as any
    }));
  }

  async getAssertionsByRecipient(recipientId: string): Promise<Assertion[]> {
    this.ensureConnected();
    
    // This is a simplified implementation that assumes recipient.id exists
    // A more robust implementation would need to handle different recipient identity formats
    const result = await this.db!.select().from(assertions)
      .where(eq(assertions.recipient.id, recipientId));
    
    return result.map(record => ({
      id: record.id.toString(),
      badgeClass: record.badgeClassId.toString(),
      recipient: record.recipient as any,
      issuedOn: record.issuedOn.toISOString(),
      expires: record.expires ? record.expires.toISOString() : undefined,
      evidence: record.evidence as any,
      verification: record.verification as any,
      revoked: record.revoked as any,
      revocationReason: record.revocationReason,
      ...record.additionalFields as any
    }));
  }

  async updateAssertion(id: string, assertion: Partial<Assertion>): Promise<Assertion | null> {
    this.ensureConnected();
    
    // Extract fields that are part of the schema
    const { 
      badgeClass, recipient, issuedOn, expires, 
      evidence, verification, revoked, revocationReason, 
      ...additionalFields 
    } = assertion;
    
    // Prepare update data
    const updateData: any = {};
    if (recipient !== undefined) updateData.recipient = recipient;
    if (issuedOn !== undefined) updateData.issuedOn = new Date(issuedOn);
    if (expires !== undefined) updateData.expires = expires ? new Date(expires) : null;
    if (evidence !== undefined) updateData.evidence = evidence;
    if (verification !== undefined) updateData.verification = verification;
    if (revoked !== undefined) updateData.revoked = revoked;
    if (revocationReason !== undefined) updateData.revocationReason = revocationReason;
    
    // Update badge class if provided
    if (badgeClass !== undefined) {
      const badgeClassId = typeof badgeClass === 'string' ? badgeClass : badgeClass.id;
      const badgeClassExists = await this.getBadgeClassById(badgeClassId);
      if (!badgeClassExists) {
        throw new Error(`Badge class with ID ${badgeClassId} does not exist`);
      }
      updateData.badgeClassId = badgeClassId;
    }
    
    // If there are additional fields, merge them with existing ones
    if (Object.keys(additionalFields).length > 0) {
      const existingAssertion = await this.getAssertionById(id);
      if (!existingAssertion) return null;
      
      const existingAdditionalFields = Object.entries(existingAssertion)
        .filter(([key]) => !['id', 'badgeClass', 'recipient', 'issuedOn', 'expires', 'evidence', 'verification', 'revoked', 'revocationReason'].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
      updateData.additionalFields = { ...existingAdditionalFields, ...additionalFields };
    }
    
    // Add updatedAt timestamp
    updateData.updatedAt = new Date();
    
    const result = await this.db!.update(assertions)
      .set(updateData)
      .where(eq(assertions.id, id))
      .returning();
    
    if (!result[0]) {
      return null;
    }
    
    return {
      id: result[0].id.toString(),
      badgeClass: result[0].badgeClassId.toString(),
      recipient: result[0].recipient as any,
      issuedOn: result[0].issuedOn.toISOString(),
      expires: result[0].expires ? result[0].expires.toISOString() : undefined,
      evidence: result[0].evidence as any,
      verification: result[0].verification as any,
      revoked: result[0].revoked as any,
      revocationReason: result[0].revocationReason,
      ...result[0].additionalFields as any
    };
  }

  async deleteAssertion(id: string): Promise<boolean> {
    this.ensureConnected();
    
    const result = await this.db!.delete(assertions).where(eq(assertions.id, id)).returning();
    return result.length > 0;
  }
}
