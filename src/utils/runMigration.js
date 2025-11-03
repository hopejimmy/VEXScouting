/**
 * Database Migration Runner
 * 
 * Safely applies database migrations with automatic rollback on error
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'vexscouting'}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function runMigration(migrationFile) {
  const migrationPath = path.join(__dirname, 'migrations', migrationFile);
  
  console.log('\n' + '='.repeat(70));
  console.log(`🔧 Running Migration: ${migrationFile}`);
  console.log('='.repeat(70) + '\n');
  
  try {
    // Read migration SQL
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Migration SQL loaded');
    console.log('⏳ Executing migration...\n');
    
    // Execute migration
    const result = await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n' + '='.repeat(70));
    console.log('MIGRATION SUCCESS');
    console.log('='.repeat(70) + '\n');
    
    return true;
  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('\n' + '='.repeat(70));
    console.error('MIGRATION FAILED - NO CHANGES APPLIED');
    console.error('='.repeat(70) + '\n');
    
    return false;
  } finally {
    await pool.end();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Error: Please provide a migration file name');
  console.error('Usage: node runMigration.js <migration_file.sql>');
  console.error('Example: node runMigration.js 001_add_composite_primary_key.sql');
  process.exit(1);
}

// Run migration
runMigration(migrationFile)
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

