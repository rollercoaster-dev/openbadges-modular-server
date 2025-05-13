/**
 * SQLite Test Environment Check
 * 
 * This script checks the SQLite test environment to ensure it's properly configured.
 * It verifies that the SQLite database file exists and has the correct permissions.
 */

const fs = require('fs');
const path = process.env.SQLITE_DB_PATH;

console.log('SQLite Test Environment Check');
console.log('-----------------------------');
console.log('SQLite file path:', path);
console.log('SQLite file exists:', fs.existsSync(path));

if (fs.existsSync(path)) {
  const stats = fs.statSync(path);
  console.log('SQLite file size:', stats.size);
  console.log('SQLite file permissions:', stats.mode.toString(8));
  
  // Check if file is writable
  try {
    const fd = fs.openSync(path, 'a');
    fs.closeSync(fd);
    console.log('SQLite file is writable: Yes');
  } catch (error) {
    console.log('SQLite file is writable: No');
    console.log('Error:', error.message);
  }
  
  // Try to open the database
  try {
    const { Database } = require('bun:sqlite');
    const db = new Database(path);
    
    // Try to execute a simple query
    const result = db.query('PRAGMA integrity_check').get();
    console.log('SQLite database integrity check:', result);
    
    // Check if we can create a table
    try {
      db.run('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)');
      console.log('SQLite can create tables: Yes');
      
      // Insert a test row
      db.run('INSERT INTO test_table (name) VALUES (?)', ['test']);
      console.log('SQLite can insert data: Yes');
      
      // Query the test row
      const testRow = db.query('SELECT * FROM test_table WHERE name = ?', ['test']).get();
      console.log('SQLite can query data:', testRow ? 'Yes' : 'No');
      
      // Clean up
      db.run('DROP TABLE test_table');
    } catch (error) {
      console.log('SQLite database operation failed:', error.message);
    }
    
    db.close();
  } catch (error) {
    console.log('Failed to open SQLite database:', error.message);
  }
} else {
  console.log('SQLite file does not exist. Creating it...');
  try {
    // Create the directory if it doesn't exist
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('Created directory:', dir);
    }
    
    // Create an empty file
    fs.writeFileSync(path, '');
    console.log('Created SQLite file:', path);
    
    // Set permissions
    fs.chmodSync(path, 0o666);
    console.log('Set SQLite file permissions to 666');
    
    // Verify file was created
    console.log('SQLite file exists after creation:', fs.existsSync(path));
    if (fs.existsSync(path)) {
      const stats = fs.statSync(path);
      console.log('SQLite file size after creation:', stats.size);
      console.log('SQLite file permissions after creation:', stats.mode.toString(8));
    }
  } catch (error) {
    console.log('Failed to create SQLite file:', error.message);
  }
}

console.log('-----------------------------');
console.log('SQLite Test Environment Check Complete');
