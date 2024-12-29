require('dotenv').config({ path: '.env.local' });
const { query } = require('../lib/postgresql');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running migration: add_private_key.sql');
    const migrationPath = path.join(__dirname, '..', 'lib', 'migrations', 'add_private_key.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);
