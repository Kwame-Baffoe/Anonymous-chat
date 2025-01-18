import { query } from '../lib/postgresql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Running migration: add_presence_column.sql');
    const migrationPath = path.join(process.cwd(), 'lib', 'migrations', 'add_presence_column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);
