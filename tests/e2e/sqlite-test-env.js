/**
 * SQLite Test Environment Check
 *
 * This script checks the SQLite test environment to ensure it's properly configured.
 * It verifies that the SQLite database file exists and has the correct permissions.
 */

const fs = require('fs');
const path = process.env.SQLITE_DB_PATH || process.env.SQLITE_FILE || './tests/e2e/test_database.sqlite';

// Simple logger for this script to avoid console usage
const logger = {
  info: (message, data) => {
    if (data !== undefined) {
      process.stdout.write(`[INFO] ${message}: ${data}\n`);
    } else {
      process.stdout.write(`[INFO] ${message}\n`);
    }
  },
  error: (message, data) => {
    if (data !== undefined) {
      process.stderr.write(`[ERROR] ${message}: ${data}\n`);
    } else {
      process.stderr.write(`[ERROR] ${message}\n`);
    }
  }
};

logger.info('SQLite Test Environment Check');
logger.info('-----------------------------');
logger.info('SQLite file path', path);
logger.info('SQLite file exists', fs.existsSync(path));

if (fs.existsSync(path)) {
  const stats = fs.statSync(path);
  logger.info('SQLite file size', stats.size);
  logger.info('SQLite file permissions', stats.mode.toString(8));

  // Check if file is writable
  try {
    const fd = fs.openSync(path, 'a');
    fs.closeSync(fd);
    logger.info('SQLite file is writable: Yes');
  } catch (error) {
    logger.info('SQLite file is writable: No');
    logger.error('Error', error.message);
  }

  // Try to open the database
  try {
    const { Database } = require('bun:sqlite');
    const db = new Database(path);

    // Try to execute a simple query
    const result = db.query('PRAGMA integrity_check').get();
    logger.info('SQLite database integrity check', result);

    // Check if we can create a table
    try {
      db.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)');
      logger.info('SQLite can create tables: Yes');

      // Insert a test row
      db.run('INSERT INTO test_table (name) VALUES (?)', ['test']);
      logger.info('SQLite can insert data: Yes');

      // Query the test row
      const testRow = db.query('SELECT * FROM test_table WHERE name = ?', ['test']).get();
      logger.info('SQLite can query data', testRow ? 'Yes' : 'No');

      // Clean up
      db.run('DROP TABLE test_table');
    } catch (error) {
      logger.error('SQLite database operation failed', error.message);
    }

    db.close();
  } catch (error) {
    logger.error('Failed to open SQLite database', error.message);
  }
} else {
  logger.info('SQLite file does not exist. Creating it...');
  try {
    // Create the directory if it doesn't exist
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex > 0) {
      const dir = path.substring(0, lastSlashIndex);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info('Created directory', dir);
      }
    }

    // Create an empty file
    fs.writeFileSync(path, '');
    logger.info('Created SQLite file', path);

    // Set permissions
    fs.chmodSync(path, 0o666);
    logger.info('Set SQLite file permissions to 666');

    // Verify file was created
    logger.info('SQLite file exists after creation', fs.existsSync(path));
    if (fs.existsSync(path)) {
      const stats = fs.statSync(path);
      logger.info('SQLite file size after creation', stats.size);
      logger.info('SQLite file permissions after creation', stats.mode.toString(8));
    }
  } catch (error) {
    logger.error('Failed to create SQLite file', error.message);
  }
}

logger.info('-----------------------------');
logger.info('SQLite Test Environment Check Complete');
