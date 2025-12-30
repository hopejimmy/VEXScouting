import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
// PostgreSQL connection configuration aligned with server.js
let pool;
if (process.env.DATABASE_URL) {
    // Production/Railway environment - use DATABASE_URL
    console.log('🔗 Using Railway DATABASE_URL for Migration');
    const isPrivateNetwork = process.env.DATABASE_URL.includes('railway.internal');

    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isPrivateNetwork ? false : { rejectUnauthorized: false }
    });
} else {
    // Development environment
    pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: process.env.POSTGRES_DB || 'vexscouting',
        port: 5432
    });
}

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
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration Failed (Continuing anyway):', e);
        // Important: Exit with 0 so the deployment doesn't fail.
        // This allows the server to start even if migration has issues.
        process.exit(0);
    } finally {
        await pool.end();
    }
}

migrate();
