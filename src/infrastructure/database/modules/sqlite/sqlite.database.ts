import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseInterface } from '../../interfaces/database.interface';
import { Issuer } from '../../../../domains/issuer/issuer.entity';
import { BadgeClass } from '../../../../domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../../../domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';
import { issuers, badgeClasses, assertions } from './schema';
import { config } from '../../../../config/config';
import { logger } from '../../../../utils/logging/logger.service';

export class SqliteDatabase implements DatabaseInterface {
  private db: ReturnType<typeof drizzle>;
  private connected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = config.database.maxConnectionAttempts || 5;
  private retryDelayMs = config.database.connectionRetryDelayMs || 1000; // Start with 1 second delay

  constructor(db: ReturnType<typeof drizzle>) {
    this.db = db;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      // For SQLite, the connection is already established when the Database object is created
      // We just need to check if the database is accessible by getting the underlying client
      const client = (this.db as any).session?.client;

      if (!client) {
        throw new Error('SQLite client not available');
      }

      // Try a simple query to verify the connection
      try {
        client.prepare('SELECT 1').get();
      } catch (queryError) {
        throw new Error(`SQLite query failed: ${queryError.message}`);
      }

      this.connected = true;
      this.connectionAttempts = 0; // Reset attempts counter on success

      if (process.env.NODE_ENV !== 'production') {
        logger.info('SQLite database connected successfully');
      }
    } catch (error) {
      this.connectionAttempts++;

      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        logger.logError(`Failed to connect to SQLite database`, error, {
          attempts: this.maxConnectionAttempts
        });
        throw new Error(`Maximum connection attempts (${this.maxConnectionAttempts}) exceeded: ${error.message}`);
      }

      // Calculate exponential backoff delay (1s, 2s, 4s, 8s, 16s)
      const delay = this.retryDelayMs * Math.pow(2, this.connectionAttempts - 1);
      logger.warn(`SQLite connection attempt failed`, {
        attempt: this.connectionAttempts,
        retryDelay: `${delay}ms`,
        errorMessage: error instanceof Error ? error.message : String(error)
      });

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.connect(); // Recursive retry
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      // Get the underlying SQLite client
      const client = (this.db as any).session?.client;

      if (client) {
        // Flush any pending writes
        try {
          client.prepare('PRAGMA wal_checkpoint(FULL)').run();
        } catch (checkpointError) {
          logger.warn('Error during WAL checkpoint', {
            errorMessage: checkpointError.message
          });
        }

        // Close the database connection
        if (typeof client.close === 'function') {
          client.close();
        }
      }

      this.connected = false;
      this.connectionAttempts = 0;

      if (process.env.NODE_ENV !== 'production') {
        logger.info('SQLite database disconnected successfully');
      }
    } catch (error) {
      logger.logError('Failed to disconnect SQLite database', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Database is not connected');
    }
  }

  // Issuer operations
  async createIssuer(issuerData: Omit<Issuer, 'id'>): Promise<Issuer> {
    this.ensureConnected();
    const { name, url, email, description, image, publicKey, ...additionalFields } = issuerData;
    const id = uuidv4() as Shared.IRI;
    const now = Date.now();
    // @ts-ignore: casting payload to any because Drizzle's insert types are too strict
    const result = await this.db.insert(issuers).values({
      id,
      name,
      url: url as string,
      email: email || null,
      description: description || null,
      image: typeof image === 'string' ? image : JSON.stringify(image),
      publicKey: publicKey ? JSON.stringify(publicKey) : null,
      createdAt: now,
      updatedAt: now,
      additionalFields: Object.keys(additionalFields).length > 0 ? JSON.stringify(additionalFields) : null
    } as any).returning();

    if (!result?.[0]) {
      throw new Error('Failed to create issuer');
    }

    const row = result[0];
    return Issuer.create({
      id: row.id.toString() as Shared.IRI,
      name: row.name,
      url: row.url as Shared.IRI,
      email: row.email || undefined,
      description: row.description || undefined,
      image: row.image as Shared.IRI,
      publicKey: row.publicKey ? JSON.parse(row.publicKey as string) : undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    });
  }

  async getIssuerById(id: Shared.IRI): Promise<Issuer | null> {
    this.ensureConnected();
    const result = await this.db.select().from(issuers).where(eq(issuers.id, id as string));
    const row = result[0];
    if (!row) return null;
    return Issuer.create({
      id: row.id.toString() as Shared.IRI,
      name: row.name,
      url: row.url as Shared.IRI,
      email: row.email || undefined,
      description: row.description || undefined,
      image: row.image as Shared.IRI,
      publicKey: row.publicKey ? JSON.parse(row.publicKey as string) : undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    });
  }

  async updateIssuer(id: Shared.IRI, issuer: Partial<Issuer>): Promise<Issuer | null> {
    this.ensureConnected();
    const { name, url, email, description, image, publicKey, ...additionalFields } = issuer;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url as string;
    if (email !== undefined) updateData.email = email;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = typeof image === 'string' ? image : JSON.stringify(image);
    if (publicKey !== undefined) updateData.publicKey = publicKey ? JSON.stringify(publicKey) : null;
    if (Object.keys(additionalFields).length > 0) {
      const existing = await this.getIssuerById(id);
      if (!existing) return null;
      const existingExtra = Object.entries(existing)
        .filter(([key]) => !['id','name','url','email','description','image','publicKey'].includes(key))
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {} as Record<string, unknown>);
      updateData.additionalFields = JSON.stringify({ ...existingExtra, ...additionalFields });
    }
    updateData.updatedAt = Date.now();

    const result = await this.db.update(issuers).set(updateData).where(eq(issuers.id, id as string)).returning();
    const row = result[0];
    if (!row) return null;
    return Issuer.create({
      id: row.id.toString() as Shared.IRI,
      name: row.name,
      url: row.url as Shared.IRI,
      email: row.email || undefined,
      description: row.description || undefined,
      image: row.image as Shared.IRI,
      publicKey: row.publicKey ? JSON.parse(row.publicKey as string) : undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    });
  }

  async deleteIssuer(id: Shared.IRI): Promise<boolean> {
    this.ensureConnected();
    const result = await this.db.delete(issuers).where(eq(issuers.id, id as string)).returning();
    return result.length > 0;
  }

  // BadgeClass operations
  async createBadgeClass(badgeClassData: Omit<BadgeClass, 'id'>): Promise<BadgeClass> {
    this.ensureConnected();
    const { issuer, name, description, image, criteria, alignment, tags, ...additionalFields } = badgeClassData;
    const id = uuidv4() as Shared.IRI;
    const issuerId = issuer as Shared.IRI;
    const now = Date.now();
    // @ts-ignore: casting payload to any because Drizzle's insert types are too strict
    const result = await this.db.insert(badgeClasses).values({
      id,
      issuerId: issuerId as string,
      name,
      description: description || '',
      image: typeof image === 'string' ? image : JSON.stringify(image),
      criteria: criteria ? JSON.stringify(criteria) : '{}',
      alignment: alignment ? JSON.stringify(alignment) : null,
      tags: tags ? JSON.stringify(tags) : null,
      createdAt: now,
      updatedAt: now,
      additionalFields: Object.keys(additionalFields).length > 0 ? JSON.stringify(additionalFields) : null
    } as any).returning();

    if (!result?.[0]) {
      throw new Error('Failed to create badge class');
    }

    const row = result[0];
    return BadgeClass.create({
      id: row.id.toString() as Shared.IRI,
      issuer: issuerId,
      name: row.name,
      description: row.description,
      image: row.image as Shared.IRI,
      criteria: row.criteria ? JSON.parse(row.criteria as string) : undefined,
      alignment: row.alignment ? JSON.parse(row.alignment as string) : undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    });
  }

  async getBadgeClassById(id: Shared.IRI): Promise<BadgeClass | null> {
    this.ensureConnected();
    const result = await this.db.select().from(badgeClasses).where(eq(badgeClasses.id, id as string));
    const row = result[0];
    if (!row) return null;
    return BadgeClass.create({
      id: row.id.toString() as Shared.IRI,
      issuer: row.issuerId as Shared.IRI,
      name: row.name,
      description: row.description,
      image: row.image as Shared.IRI,
      criteria: row.criteria ? JSON.parse(row.criteria as string) : undefined,
      alignment: row.alignment ? JSON.parse(row.alignment as string) : undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    });
  }

  async getBadgeClassesByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    this.ensureConnected();
    const result = await this.db.select().from(badgeClasses).where(eq(badgeClasses.issuerId, issuerId as string));
    return result.map(row => BadgeClass.create({
      id: row.id.toString() as Shared.IRI,
      issuer: row.issuerId as Shared.IRI,
      name: row.name,
      description: row.description,
      image: row.image as Shared.IRI,
      criteria: row.criteria ? JSON.parse(row.criteria as string) : undefined,
      alignment: row.alignment ? JSON.parse(row.alignment as string) : undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    }));
  }

  async updateBadgeClass(id: Shared.IRI, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null> {
    this.ensureConnected();
    const { issuer, name, description, image, criteria, alignment, tags, ...additionalFields } = badgeClass;
    const updateData: Record<string, unknown> = {};
    if (issuer !== undefined) {
      const badgeIssuerId = issuer as Shared.IRI;
      const exists = await this.getIssuerById(badgeIssuerId);
      if (!exists) throw new Error(`Issuer with ID ${badgeIssuerId} does not exist`);
      updateData.issuerId = badgeIssuerId as string;
    }
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = typeof image === 'string' ? image : JSON.stringify(image);
    if (criteria !== undefined) updateData.criteria = JSON.stringify(criteria);
    if (alignment !== undefined) updateData.alignment = JSON.stringify(alignment);
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (Object.keys(additionalFields).length > 0) {
      const existing = await this.getBadgeClassById(id);
      if (!existing) return null;
      const existingExtra = Object.entries(existing)
        .filter(([key]) => !['id','issuer','name','description','image','criteria','alignment','tags'].includes(key))
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {} as Record<string, unknown>);
      updateData.additionalFields = JSON.stringify({ ...existingExtra, ...additionalFields });
    }
    updateData.updatedAt = Date.now();

    const result = await this.db.update(badgeClasses).set(updateData).where(eq(badgeClasses.id, id as string)).returning();
    const row = result[0];
    if (!row) return null;
    return BadgeClass.create({
      id: row.id.toString() as Shared.IRI,
      issuer: row.issuerId as Shared.IRI,
      name: row.name,
      description: row.description,
      image: row.image as Shared.IRI,
      criteria: row.criteria ? JSON.parse(row.criteria as string) : undefined,
      alignment: row.alignment ? JSON.parse(row.alignment as string) : undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    });
  }

  async deleteBadgeClass(id: Shared.IRI): Promise<boolean> {
    this.ensureConnected();
    const result = await this.db.delete(badgeClasses).where(eq(badgeClasses.id, id as string)).returning();
    return result.length > 0;
  }

  // Assertion operations
  async createAssertion(assertionData: Omit<Assertion, 'id'>): Promise<Assertion> {
    this.ensureConnected();
    const {
      badgeClass, recipient, issuedOn, expires,
      evidence, verification, revoked, revocationReason, ...additionalFields
    } = assertionData;
    const id = uuidv4() as Shared.IRI;
    const badgeClassId = badgeClass as Shared.IRI;
    const now = Date.now();
    // @ts-ignore: casting payload to any because Drizzle's insert types are too strict
    const result = await this.db.insert(assertions).values({
      id,
      badgeClassId: badgeClassId as string,
      recipient: JSON.stringify(recipient),
      issuedOn: issuedOn ? new Date(issuedOn).getTime() : now,
      expires: expires ? new Date(expires).getTime() : null,
      evidence: evidence ? JSON.stringify(evidence) : null,
      verification: verification ? JSON.stringify(verification) : null,
      revoked: revoked !== undefined ? (revoked ? 1 : 0) : null,
      revocationReason: revocationReason || null,
      createdAt: now,
      updatedAt: now,
      additionalFields: Object.keys(additionalFields).length > 0 ? JSON.stringify(additionalFields) : null
    } as any).returning();

    if (!result?.[0]) {
      throw new Error('Failed to create assertion');
    }

    const row = result[0];
    return Assertion.create({
      id: row.id.toString() as Shared.IRI,
      badgeClass: row.badgeClassId as Shared.IRI,
      recipient: JSON.parse(row.recipient as string),
      issuedOn: new Date(row.issuedOn as number).toISOString(),
      expires: row.expires ? new Date(row.expires as number).toISOString() : undefined,
      evidence: row.evidence ? JSON.parse(row.evidence as string) : undefined,
      verification: row.verification ? JSON.parse(row.verification as string) : undefined,
      revoked: row.revoked !== null ? Boolean(row.revoked) : undefined,
      revocationReason: row.revocationReason || undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    });
  }

  async getAssertionById(id: Shared.IRI): Promise<Assertion | null> {
    this.ensureConnected();
    const result = await this.db.select().from(assertions).where(eq(assertions.id, id as string));
    const row = result[0];
    if (!row) return null;
    return Assertion.create({
      id: row.id.toString() as Shared.IRI,
      badgeClass: row.badgeClassId as Shared.IRI,
      recipient: JSON.parse(row.recipient as string),
      issuedOn: new Date(row.issuedOn as number).toISOString(),
      expires: row.expires ? new Date(row.expires as number).toISOString() : undefined,
      evidence: row.evidence ? JSON.parse(row.evidence as string) : undefined,
      verification: row.verification ? JSON.parse(row.verification as string) : undefined,
      revoked: row.revoked !== null ? Boolean(row.revoked) : undefined,
      revocationReason: row.revocationReason || undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    });
  }

  async getAssertionsByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]> {
    this.ensureConnected();
    const result = await this.db.select().from(assertions).where(eq(assertions.badgeClassId, badgeClassId as string));
    return result.map(row => Assertion.create({
      id: row.id.toString() as Shared.IRI,
      badgeClass: row.badgeClassId as Shared.IRI,
      recipient: JSON.parse(row.recipient as string),
      issuedOn: new Date(row.issuedOn as number).toISOString(),
      expires: row.expires ? new Date(row.expires as number).toISOString() : undefined,
      evidence: row.evidence ? JSON.parse(row.evidence as string) : undefined,
      verification: row.verification ? JSON.parse(row.verification as string) : undefined,
      revoked: row.revoked !== null ? Boolean(row.revoked) : undefined,
      revocationReason: row.revocationReason || undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    }));
  }

  async getAssertionsByRecipient(recipientId: string): Promise<Assertion[]> {
    this.ensureConnected();
    const result = await this.db.select().from(assertions).where(sql`json_extract(${assertions.recipient}, '$.identity') = ${recipientId}`);
    return result.map(row => Assertion.create({
      id: row.id.toString() as Shared.IRI,
      badgeClass: row.badgeClassId as Shared.IRI,
      recipient: JSON.parse(row.recipient as string),
      issuedOn: new Date(row.issuedOn as number).toISOString(),
      expires: row.expires ? new Date(row.expires as number).toISOString() : undefined,
      evidence: row.evidence ? JSON.parse(row.evidence as string) : undefined,
      verification: row.verification ? JSON.parse(row.verification as string) : undefined,
      revoked: row.revoked !== null ? Boolean(row.revoked) : undefined,
      revocationReason: row.revocationReason || undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    }));
  }

  async updateAssertion(id: Shared.IRI, assertion: Partial<Assertion>): Promise<Assertion | null> {
    this.ensureConnected();
    const {
      badgeClass, recipient, issuedOn, expires,
      evidence, verification, revoked, revocationReason, ...additionalFields
    } = assertion;
    const updateData: Record<string, unknown> = {};
    if (badgeClass !== undefined) {
      const badgeClassId = badgeClass as Shared.IRI;
      const exists = await this.getBadgeClassById(badgeClassId);
      if (!exists) throw new Error(`Badge class with ID ${badgeClassId} does not exist`);
      updateData.badgeClassId = badgeClassId as string;
    }
    if (recipient !== undefined) updateData.recipient = JSON.stringify(recipient);
    if (issuedOn !== undefined) updateData.issuedOn = new Date(issuedOn).getTime();
    if (expires !== undefined) updateData.expires = expires ? new Date(expires).getTime() : null;
    if (evidence !== undefined) updateData.evidence = evidence ? JSON.stringify(evidence) : null;
    if (verification !== undefined) updateData.verification = verification ? JSON.stringify(verification) : null;
    if (revoked !== undefined) updateData.revoked = revoked ? 1 : 0;
    if (revocationReason !== undefined) updateData.revocationReason = revocationReason;
    if (Object.keys(additionalFields).length > 0) {
      const existing = await this.getAssertionById(id);
      if (!existing) return null;
      const existingExtra = Object.entries(existing)
        .filter(([key]) => !['id','badgeClass','recipient','issuedOn','expires','evidence','verification','revoked','revocationReason'].includes(key))
        .reduce((obj,[key,val]) => ({...obj,[key]:val}),{} as Record<string,unknown>);
      updateData.additionalFields = JSON.stringify({ ...existingExtra, ...additionalFields });
    }
    updateData.updatedAt = Date.now();

    const result = await this.db.update(assertions).set(updateData).where(eq(assertions.id, id as string)).returning();
    const row = result[0];
    if (!row) return null;
    return Assertion.create({
      id: row.id.toString() as Shared.IRI,
      badgeClass: row.badgeClassId as Shared.IRI,
      recipient: JSON.parse(row.recipient as string),
      issuedOn: new Date(row.issuedOn as number).toISOString(),
      expires: row.expires ? new Date(row.expires as number).toISOString() : undefined,
      evidence: row.evidence ? JSON.parse(row.evidence as string) : undefined,
      verification: row.verification ? JSON.parse(row.verification as string) : undefined,
      revoked: row.revoked !== null ? Boolean(row.revoked) : undefined,
      revocationReason: row.revocationReason || undefined,
      ...(row.additionalFields ? JSON.parse(row.additionalFields as string) : {})
    });
  }

  async deleteAssertion(id: Shared.IRI): Promise<boolean> {
    this.ensureConnected();
    const result = await this.db.delete(assertions).where(eq(assertions.id, id as string)).returning();
    return result.length > 0;
  }
}