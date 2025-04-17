# Database Module Guide

This guide explains how to add support for additional database systems to the Open Badges API.

## Architecture Overview

The Open Badges API uses a modular database architecture based on the Data Mapper pattern. This allows for easy integration with different database systems while maintaining a clean separation between domain logic and data access.

The key components of this architecture are:

1. **Domain Entities**: Version-agnostic models representing Issuers, BadgeClasses, and Assertions
2. **Repository Interfaces**: Define the contract for data access operations
3. **Mappers**: Convert between domain entities and database-specific formats
4. **Repository Implementations**: Implement repository interfaces for specific databases
5. **Database Factory**: Creates and configures database connections

## Adding a New Database Module

To add support for a new database system, follow these steps:

### 1. Create a Database Schema

Define the schema for your database system. This will vary depending on the database you're using.

For example, if adding MongoDB support:

```typescript
// src/infrastructure/database/modules/mongodb/schema.ts

import { Shared } from 'openbadges-types';

export interface IssuerDocument {
  _id: Shared.IRI;
  name: string;
  url: string;
  email?: string;
  description?: string;
  image?: string;
  publicKey?: any;
  createdAt: Date;
  updatedAt: Date;
  additionalFields?: Record<string, any>;
}

export interface BadgeClassDocument {
  _id: Shared.IRI;
  issuerId: Shared.IRI;
  name: string;
  description: string;
  image: string;
  criteria: any;
  alignment?: any[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  additionalFields?: Record<string, any>;
}

export interface AssertionDocument {
  _id: Shared.IRI;
  badgeClassId: Shared.IRI;
  recipient: any;
  issuedOn: Date;
  expires?: Date;
  evidence?: any;
  verification?: any;
  revoked?: boolean;
  revocationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  additionalFields?: Record<string, any>;
}
```

### 2. Create Mappers

Create mappers to convert between domain entities and database-specific formats:

```typescript
// src/infrastructure/database/modules/mongodb/mappers/mongo-issuer.mapper.ts

import { Issuer } from '../../../../../domains/issuer/issuer.entity';
import { IssuerDocument } from '../schema';

export class MongoIssuerMapper {
  /**
   * Converts a database document to a domain entity
   */
  toDomain(document: IssuerDocument): Issuer {
    return Issuer.create({
      id: document._id,
      name: document.name,
      url: document.url,
      email: document.email,
      description: document.description,
      image: document.image,
      publicKey: document.publicKey,
      ...document.additionalFields
    });
  }

  /**
   * Converts a domain entity to a database document
   */
  toPersistence(entity: Issuer): Omit<IssuerDocument, '_id'> & { _id?: string } {
    const now = new Date();
    
    // Extract known properties
    const { id, name, url, email, description, image, publicKey, ...additionalFields } = entity.toObject();
    
    return {
      _id: id,
      name,
      url,
      email,
      description,
      image,
      publicKey,
      createdAt: now,
      updatedAt: now,
      additionalFields
    };
  }
}
```

Create similar mappers for BadgeClass and Assertion entities.

### 3. Implement Repository Interfaces

Implement the repository interfaces for your database system:

```typescript
// src/infrastructure/database/modules/mongodb/repositories/mongo-issuer.repository.ts

import { Collection } from 'mongodb';
import { Issuer } from '../../../../../domains/issuer/issuer.entity';
import { IssuerRepository } from '../../../../../domains/issuer/issuer.repository';
import { IssuerDocument } from '../schema';
import { MongoIssuerMapper } from '../mappers/mongo-issuer.mapper';

export class MongoIssuerRepository implements IssuerRepository {
  constructor(
    private collection: Collection<IssuerDocument>,
    private mapper: MongoIssuerMapper
  ) {}

  async create(issuer: Issuer): Promise<Issuer> {
    const document = this.mapper.toPersistence(issuer);
    
    // Insert into MongoDB
    const result = await this.collection.insertOne(document as IssuerDocument);
    
    // Return the created issuer with the generated ID
    return this.mapper.toDomain({
      ...document,
      _id: result.insertedId.toString()
    } as IssuerDocument);
  }

  async findById(id: string): Promise<Issuer | null> {
    const document = await this.collection.findOne({ _id: id });
    
    if (!document) {
      return null;
    }
    
    return this.mapper.toDomain(document);
  }

  async findAll(): Promise<Issuer[]> {
    const documents = await this.collection.find().toArray();
    return documents.map(doc => this.mapper.toDomain(doc));
  }

  async update(id: string, data: Partial<Issuer>): Promise<Issuer | null> {
    // Find the existing document
    const existingDocument = await this.collection.findOne({ _id: id });
    
    if (!existingDocument) {
      return null;
    }
    
    // Create an updated entity
    const existingEntity = this.mapper.toDomain(existingDocument);
    const updatedEntity = Issuer.create({
      ...existingEntity.toObject(),
      ...data
    });
    
    // Convert to persistence format
    const document = this.mapper.toPersistence(updatedEntity);
    document.updatedAt = new Date();
    
    // Update in MongoDB
    await this.collection.updateOne(
      { _id: id },
      { $set: document }
    );
    
    // Return the updated entity
    return updatedEntity;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
```

Implement similar repositories for BadgeClass and Assertion entities.

### 4. Create a Database Module

Create a database module that implements the `DatabaseModule` interface:

```typescript
// src/infrastructure/database/modules/mongodb/mongodb.module.ts

import { MongoClient, Db } from 'mongodb';
import { DatabaseModule } from '../../interfaces/database-module.interface';
import { IssuerRepository } from '../../../../domains/issuer/issuer.repository';
import { BadgeClassRepository } from '../../../../domains/badgeClass/badgeClass.repository';
import { AssertionRepository } from '../../../../domains/assertion/assertion.repository';
import { MongoIssuerRepository } from './repositories/mongo-issuer.repository';
import { MongoBadgeClassRepository } from './repositories/mongo-badge-class.repository';
import { MongoAssertionRepository } from './repositories/mongo-assertion.repository';
import { MongoIssuerMapper } from './mappers/mongo-issuer.mapper';
import { MongoBadgeClassMapper } from './mappers/mongo-badge-class.mapper';
import { MongoAssertionMapper } from './mappers/mongo-assertion.mapper';
import { IssuerDocument, BadgeClassDocument, AssertionDocument } from './schema';

export class MongoDBModule implements DatabaseModule {
  private client: MongoClient;
  private db: Db;
  
  constructor(private connectionString: string, private dbName: string) {}
  
  async connect(): Promise<void> {
    this.client = new MongoClient(this.connectionString);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    
    // Create indexes if needed
    await this.createIndexes();
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
  
  private async createIndexes(): Promise<void> {
    // Create any necessary indexes
    await this.db.collection('issuers').createIndex({ name: 1 });
    await this.db.collection('badgeClasses').createIndex({ issuerId: 1 });
    await this.db.collection('assertions').createIndex({ badgeClassId: 1 });
  }
  
  createIssuerRepository(): IssuerRepository {
    const collection = this.db.collection<IssuerDocument>('issuers');
    const mapper = new MongoIssuerMapper();
    return new MongoIssuerRepository(collection, mapper);
  }
  
  createBadgeClassRepository(): BadgeClassRepository {
    const collection = this.db.collection<BadgeClassDocument>('badgeClasses');
    const mapper = new MongoBadgeClassMapper();
    return new MongoBadgeClassRepository(collection, mapper);
  }
  
  createAssertionRepository(): AssertionRepository {
    const collection = this.db.collection<AssertionDocument>('assertions');
    const mapper = new MongoAssertionMapper();
    return new MongoAssertionRepository(collection, mapper);
  }
}
```

### 5. Register the Database Module

Update the database factory to include your new database module:

```typescript
// src/infrastructure/database/database.factory.ts

import { DatabaseModule } from './interfaces/database-module.interface';
import { PostgreSQLModule } from './modules/postgresql/postgresql.module';
import { MongoDBModule } from './modules/mongodb/mongodb.module';
import { config } from '../../config/config';

export class DatabaseFactory {
  static createDatabaseModule(): DatabaseModule {
    const dbType = config.database.type;
    
    switch (dbType) {
      case 'postgresql':
        return new PostgreSQLModule(
          config.database.postgresql.connectionString
        );
      case 'mongodb':
        return new MongoDBModule(
          config.database.mongodb.connectionString,
          config.database.mongodb.dbName
        );
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }
}
```

### 6. Update Configuration

Update the configuration to include settings for your new database module:

```typescript
// src/config/config.ts

export const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },
  database: {
    type: process.env.DB_TYPE || 'postgresql',
    postgresql: {
      connectionString: process.env.POSTGRESQL_CONNECTION_STRING || 'postgres://postgres:postgres@localhost:5432/openbadges'
    },
    mongodb: {
      connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
      dbName: process.env.MONGODB_DB_NAME || 'openbadges'
    }
  }
};
```

## Testing Your Database Module

Create tests for your new database module to ensure it works correctly:

```typescript
// tests/infrastructure/database/modules/mongodb/repositories.test.ts

import { MongoClient, Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoIssuerRepository } from '../../../../../src/infrastructure/database/modules/mongodb/repositories/mongo-issuer.repository';
import { MongoBadgeClassRepository } from '../../../../../src/infrastructure/database/modules/mongodb/repositories/mongo-badge-class.repository';
import { MongoAssertionRepository } from '../../../../../src/infrastructure/database/modules/mongodb/repositories/mongo-assertion.repository';
import { MongoIssuerMapper } from '../../../../../src/infrastructure/database/modules/mongodb/mappers/mongo-issuer.mapper';
import { MongoBadgeClassMapper } from '../../../../../src/infrastructure/database/modules/mongodb/mappers/mongo-badge-class.mapper';
import { MongoAssertionMapper } from '../../../../../src/infrastructure/database/modules/mongodb/mappers/mongo-assertion.mapper';
import { Issuer } from '../../../../../src/domains/issuer/issuer.entity';
import { BadgeClass } from '../../../../../src/domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../../../../src/domains/assertion/assertion.entity';

describe('MongoDB Repositories', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let issuerRepository: MongoIssuerRepository;
  let badgeClassRepository: MongoBadgeClassRepository;
  let assertionRepository: MongoAssertionRepository;
  
  // Test data
  const testIssuerData = {
    name: 'Test University',
    url: 'https://test.edu',
    email: 'badges@test.edu',
    description: 'A test university for testing',
    image: 'https://test.edu/logo.png'
  };
  
  // Setup database connection
  beforeAll(async () => {
    // Create in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Connect to database
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
    
    // Create repositories
    issuerRepository = new MongoIssuerRepository(
      db.collection('issuers'),
      new MongoIssuerMapper()
    );
    
    badgeClassRepository = new MongoBadgeClassRepository(
      db.collection('badgeClasses'),
      new MongoBadgeClassMapper()
    );
    
    assertionRepository = new MongoAssertionRepository(
      db.collection('assertions'),
      new MongoAssertionMapper()
    );
  });
  
  // Clean up database connection
  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });
  
  // Clean up data before each test
  beforeEach(async () => {
    await db.collection('assertions').deleteMany({});
    await db.collection('badgeClasses').deleteMany({});
    await db.collection('issuers').deleteMany({});
  });
  
  // Test the repositories
  // (similar to the PostgreSQL repository tests)
});
```

## Integration with Your Own Data Structures

If you want to integrate the Open Badges API with your own data structures, you can create a custom database module that connects to your existing data store. This allows you to use the Open Badges domain logic while storing the data in your own format.

Here's an example of how to create a custom database module that integrates with your own data structures:

```typescript
// src/infrastructure/database/modules/custom/custom.module.ts

import { DatabaseModule } from '../../interfaces/database-module.interface';
import { IssuerRepository } from '../../../../domains/issuer/issuer.repository';
import { BadgeClassRepository } from '../../../../domains/badgeClass/badgeClass.repository';
import { AssertionRepository } from '../../../../domains/assertion/assertion.repository';
import { CustomIssuerRepository } from './repositories/custom-issuer.repository';
import { CustomBadgeClassRepository } from './repositories/custom-badge-class.repository';
import { CustomAssertionRepository } from './repositories/custom-assertion.repository';
import { YourCustomDataService } from './your-custom-data-service';

export class CustomDatabaseModule implements DatabaseModule {
  private dataService: YourCustomDataService;
  
  constructor(private config: any) {
    this.dataService = new YourCustomDataService(config);
  }
  
  async connect(): Promise<void> {
    // Connect to your custom data store if needed
    await this.dataService.connect();
  }
  
  async disconnect(): Promise<void> {
    // Disconnect from your custom data store if needed
    await this.dataService.disconnect();
  }
  
  createIssuerRepository(): IssuerRepository {
    return new CustomIssuerRepository(this.dataService);
  }
  
  createBadgeClassRepository(): BadgeClassRepository {
    return new CustomBadgeClassRepository(this.dataService);
  }
  
  createAssertionRepository(): AssertionRepository {
    return new CustomAssertionRepository(this.dataService);
  }
}
```

Then implement your custom repositories that map between the Open Badges domain entities and your own data structures:

```typescript
// src/infrastructure/database/modules/custom/repositories/custom-issuer.repository.ts

import { Issuer } from '../../../../../domains/issuer/issuer.entity';
import { IssuerRepository } from '../../../../../domains/issuer/issuer.repository';
import { YourCustomDataService } from '../your-custom-data-service';

export class CustomIssuerRepository implements IssuerRepository {
  constructor(private dataService: YourCustomDataService) {}
  
  async create(issuer: Issuer): Promise<Issuer> {
    // Convert the Open Badges issuer to your custom format
    const customData = this.convertToCustomFormat(issuer);
    
    // Save to your custom data store
    const savedData = await this.dataService.saveIssuer(customData);
    
    // Convert back to an Open Badges issuer
    return this.convertFromCustomFormat(savedData);
  }
  
  async findById(id: string): Promise<Issuer | null> {
    // Retrieve from your custom data store
    const customData = await this.dataService.getIssuerById(id);
    
    if (!customData) {
      return null;
    }
    
    // Convert to an Open Badges issuer
    return this.convertFromCustomFormat(customData);
  }
  
  async findAll(): Promise<Issuer[]> {
    // Retrieve from your custom data store
    const customDataList = await this.dataService.getAllIssuers();
    
    // Convert to Open Badges issuers
    return customDataList.map(data => this.convertFromCustomFormat(data));
  }
  
  async update(id: string, data: Partial<Issuer>): Promise<Issuer | null> {
    // Retrieve existing data
    const existingData = await this.dataService.getIssuerById(id);
    
    if (!existingData) {
      return null;
    }
    
    // Convert to an Open Badges issuer
    const existingIssuer = this.convertFromCustomFormat(existingData);
    
    // Create updated issuer
    const updatedIssuer = Issuer.create({
      ...existingIssuer.toObject(),
      ...data
    });
    
    // Convert to your custom format
    const updatedCustomData = this.convertToCustomFormat(updatedIssuer);
    
    // Save to your custom data store
    const savedData = await this.dataService.updateIssuer(id, updatedCustomData);
    
    // Convert back to an Open Badges issuer
    return this.convertFromCustomFormat(savedData);
  }
  
  async delete(id: string): Promise<boolean> {
    // Delete from your custom data store
    return await this.dataService.deleteIssuer(id);
  }
  
  private convertToCustomFormat(issuer: Issuer): any {
    // Convert from Open Badges issuer to your custom format
    const { id, name, url, email, description, image, ...rest } = issuer.toObject();
    
    return {
      id,
      name,
      url,
      email,
      description,
      image,
      // Map other fields as needed for your custom format
      customField1: rest.customField1,
      customField2: rest.customField2,
      // ...
    };
  }
  
  private convertFromCustomFormat(customData: any): Issuer {
    // Convert from your custom format to an Open Badges issuer
    return Issuer.create({
      id: customData.id,
      name: customData.name,
      url: customData.url,
      email: customData.email,
      description: customData.description,
      image: customData.image,
      // Map other fields as needed from your custom format
      customField1: customData.customField1,
      customField2: customData.customField2,
      // ...
    });
  }
}
```

Implement similar repositories for BadgeClass and Assertion entities.

## Conclusion

By following this guide, you can add support for additional database systems to the Open Badges API or integrate it with your own data structures. The modular architecture allows for flexibility while maintaining a clean separation between domain logic and data access.

If you have any questions or need further assistance, please open an issue on the project repository.
