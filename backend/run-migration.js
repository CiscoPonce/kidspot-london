import { db } from './src/clients/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'db', 'migrations', '006_add_price_level.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration: 006_add_price_level.sql');
    await db.query(sql);
    console.log('Migration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

runMigration();
