const dotenv = require('dotenv');
const { query } = require('../lib/postgresql');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
if (result.error) {
  throw new Error('Failed to load .env.local file');
}

async function runMigration() {
  try {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
      throw new Error('Please provide a migration file name as an argument');
    }
    console.log('Running migration:', migrationFile);
    const migrationPath = path.join(__dirname, '..', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);
