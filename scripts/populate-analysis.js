import pg from 'pg';
import dotenv from 'dotenv';
import { ensureTeamAnalysis } from '../src/api/services/analysis.js';

// Load environment variables
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const ROBOTEVENTS_API_TOKEN = process.env.ROBOTEVENTS_API_TOKEN;
const CURRENT_SEASON_ID = process.env.CURRENT_SEASON_ID || 197;
const RATE_LIMIT_DELAY = 1500; // 1.5 seconds between team processing to be safe

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log('🚀 Starting Background Analysis Sync...');

    if (!ROBOTEVENTS_API_TOKEN) {
        console.error('❌ ROBOTEVENTS_API_TOKEN is missing. Exiting.');
        process.exit(1);
    }

    try {
        // 1. Fetch tracked teams
        const client = await pool.connect();
        const res = await client.query('SELECT team_number FROM tracked_teams ORDER BY created_at DESC');
        const teams = res.rows.map(r => r.team_number);
        client.release();

        if (teams.length === 0) {
            console.log('ℹ️ No tracked teams found. Exiting.');
            process.exit(0);
        }

        console.log(`📋 Found ${teams.length} tracked teams to process: ${teams.join(', ')}`);

        // 2. Process teams sequentially with rate limiting
        for (let i = 0; i < teams.length; i++) {
            const teamNumber = teams[i];
            console.log(`\n[${i + 1}/${teams.length}] Processing Team ${teamNumber}...`);

            const startTime = Date.now();

            try {
                // We use the existing service function, but we wrap it to catch errors
                // ensureTeamAnalysis handles caching internally, so it won't re-fetch if not needed
                // BUT it does internal rate limiting for events.

                await ensureTeamAnalysis(pool, teamNumber, ROBOTEVENTS_API_TOKEN, CURRENT_SEASON_ID);
                console.log(`✅ Team ${teamNumber} processed successfully.`);
            } catch (err) {
                console.error(`❌ Failed to process team ${teamNumber}:`, err.message);
                if (err.message.includes('429')) {
                    console.warn('⚠️ 429 Too Many Requests detected. Pausing for 60 seconds...');
                    await sleep(60000);
                }
            }

            // Wait before next team to be kind to the API
            const elapsedTime = Date.now() - startTime;
            const timeToWait = Math.max(0, RATE_LIMIT_DELAY - elapsedTime);

            if (i < teams.length - 1) {
                console.log(`⏳ Waiting ${timeToWait}ms before next team...`);
                await sleep(timeToWait);
            }
        }

        console.log('\n🎉 Analysis Sync Complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal Error in Script:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
