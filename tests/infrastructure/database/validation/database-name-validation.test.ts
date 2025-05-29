import { it, expect, describe } from 'bun:test';

describe('Database Name Validation', () => {
  function validateDatabaseName(dbName: string): boolean {
    // This is the same regex used in postgres-test-helper.ts
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName);
  }

  function testValidationThrows(dbName: string): void {
    // Simulate the validation logic from postgres-test-helper.ts
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
      throw new Error(
        `Invalid database name format: ${dbName}. Database names must start with a letter or underscore and contain only letters, numbers, and underscores.`
      );
    }
  }

  describe('Valid database names', () => {
    const validNames = [
      'openbadges_test',
      'test_db',
      'TestDB',
      '_private_db',
      'db123',
      'my_test_database_2023',
      'a',
      '_',
      'test_DB_123',
      'UPPERCASE',
    ];

    validNames.forEach((name) => {
      it(`should accept "${name}"`, () => {
        expect(validateDatabaseName(name)).toBe(true);
        expect(() => testValidationThrows(name)).not.toThrow();
      });
    });
  });

  describe('Invalid database names', () => {
    const invalidNames = [
      { name: '123invalid', reason: 'starts with number' },
      { name: 'test-db', reason: 'contains dash' },
      { name: 'test db', reason: 'contains space' },
      { name: 'test.db', reason: 'contains dot' },
      { name: 'test@db', reason: 'contains special character' },
      { name: '', reason: 'empty string' },
      { name: 'test;DROP TABLE users;--', reason: 'SQL injection attempt' },
      { name: 'db!', reason: 'contains exclamation mark' },
      { name: 'test/db', reason: 'contains slash' },
      { name: 'test\\db', reason: 'contains backslash' },
      { name: 'test%db', reason: 'contains percent' },
      { name: 'test*db', reason: 'contains asterisk' },
      { name: 'test(db)', reason: 'contains parentheses' },
      { name: 'test[db]', reason: 'contains brackets' },
      { name: 'test{db}', reason: 'contains braces' },
      { name: 'test|db', reason: 'contains pipe' },
      { name: 'test&amp;db', reason: 'contains HTML entity' },
      { name: 'test"db', reason: 'contains quote' },
      { name: "test'db", reason: 'contains apostrophe' },
    ];

    invalidNames.forEach(({ name, reason }) => {
      it(`should reject "${name}" (${reason})`, () => {
        expect(validateDatabaseName(name)).toBe(false);
        expect(() => testValidationThrows(name)).toThrow(
          `Invalid database name format: ${name}. Database names must start with a letter or underscore and contain only letters, numbers, and underscores.`
        );
      });
    });
  });

  describe('SQL injection prevention', () => {
    const sqlInjectionAttempts = [
      'test; DROP TABLE users; --',
      'test\'; DROP TABLE users; --',
      'test" OR 1=1; --',
      'test\' UNION SELECT * FROM users; --',
      'test; DELETE FROM users; --',
      'test\\\'; INSERT INTO users VALUES (\\'hacker\\'); --',
      'test OR 1=1',
      'test; EXEC xp_cmdshell(\\'dir\\'); --',
      'test\'; TRUNCATE TABLE users; --',
      'test UNION ALL SELECT NULL,NULL,NULL--',
    ];

    sqlInjectionAttempts.forEach((injection) => {
      it(`should block SQL injection attempt: "${injection}"`, () => {
        expect(validateDatabaseName(injection)).toBe(false);
        expect(() => testValidationThrows(injection)).toThrow();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle very long valid names', () => {
      const longValidName = 'a'.repeat(100) + '_test_123';
      expect(validateDatabaseName(longValidName)).toBe(true);
      expect(() => testValidationThrows(longValidName)).not.toThrow();
    });

    it('should handle very long invalid names', () => {
      const longInvalidName = '1' + 'a'.repeat(100);
      expect(validateDatabaseName(longInvalidName)).toBe(false);
      expect(() => testValidationThrows(longInvalidName)).toThrow();
    });

    it('should handle Unicode characters', () => {
      const unicodeName = 'test_café_db';
      expect(validateDatabaseName(unicodeName)).toBe(false);
      expect(() => testValidationThrows(unicodeName)).toThrow();
    });

    it('should handle mixed case with underscores and numbers', () => {
      const mixedName = 'Test_DB_123_End';
      expect(validateDatabaseName(mixedName)).toBe(true);
      expect(() => testValidationThrows(mixedName)).not.toThrow();
    });
  });
});
