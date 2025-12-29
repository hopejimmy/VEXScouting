import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'vexscouting',
    port: 5432,
    // Railway often requires SSL for production connections
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
    try {
        console.log('🔄 Checking Database Schema...');

        // 1. Add last_updated to events
        console.log(' - Checking events table for last_updated...');
        await pool.query(`
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);

        // Future migrations can go here...

        console.log('✅ Database Migration Complete.');
    } catch (e) {
        console.error('❌ Migration Failed:', e);
        process.exit(1); // Exit with error so deployment fails if migration fails
    } finally {
        await pool.end();
    }
}

migrate();
