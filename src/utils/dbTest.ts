import Database from 'better-sqlite3';
import { getLatestSkillsStandings } from './skillsParser.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SkillsStandingRow {
    rank: number;
    score: number;
    autonomous_skills: number;
    driver_skills: number;
    highest_autonomous_skills: number;
    highest_driver_skills: number;
    highest_autonomous_timestamp: string;
    highest_driver_timestamp: string;
    highest_autonomous_stop_time: number;
    highest_driver_stop_time: number;
    team_number: string;
    team_name: string;
    organization: string;
    event_region: string;
    country: string;
}

function initializeDb(): Database.Database {
    const db = new Database(':memory:'); // Using in-memory database for testing
    
    // Create the skills standings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS skills_standings (
            rank INTEGER PRIMARY KEY,
            score INTEGER,
            autonomous_skills INTEGER,
            driver_skills INTEGER,
            highest_autonomous_skills INTEGER,
            highest_driver_skills INTEGER,
            highest_autonomous_timestamp TEXT,
            highest_driver_timestamp TEXT,
            highest_autonomous_stop_time INTEGER,
            highest_driver_stop_time INTEGER,
            team_number TEXT,
            team_name TEXT,
            organization TEXT,
            event_region TEXT,
            country TEXT
        )
    `);

    return db;
}

function formatDate(date: Date): string {
    try {
        return date.toISOString();
    } catch (error) {
        return new Date().toISOString(); // Use current date as fallback
    }
}

function storeSkillsStandings(db: Database.Database, data: ReturnType<typeof getLatestSkillsStandings>) {
    const insert = db.prepare(`
        INSERT INTO skills_standings (
            rank, score, autonomous_skills, driver_skills,
            highest_autonomous_skills, highest_driver_skills,
            highest_autonomous_timestamp, highest_driver_timestamp,
            highest_autonomous_stop_time, highest_driver_stop_time,
            team_number, team_name, organization, event_region, country
        ) VALUES (
            @rank, @score, @autonomousSkills, @driverSkills,
            @highestAutonomousSkills, @highestDriverSkills,
            @highestAutonomousTimestamp, @highestDriverTimestamp,
            @highestAutonomousStopTime, @highestDriverStopTime,
            @teamNumber, @teamName, @organization, @eventRegion, @country
        )
    `);

    const transaction = db.transaction((standings) => {
        for (const standing of standings) {
            insert.run({
                ...standing,
                highestAutonomousTimestamp: formatDate(standing.highestAutonomousTimestamp),
                highestDriverTimestamp: formatDate(standing.highestDriverTimestamp)
            });
        }
    });

    transaction(data.standings);
}

// Run the test
async function main() {
    try {
        // Initialize database
        const db = initializeDb();
        console.log('Database initialized');

        // Get latest skills standings
        const data = getLatestSkillsStandings();
        console.log(`Loaded ${data.totalTeams} teams from CSV`);

        // Store data in SQLite
        storeSkillsStandings(db, data);
        console.log('Data stored in SQLite');

        // Query top 10 teams
        const stmt = db.prepare(`
            SELECT * FROM skills_standings 
            ORDER BY score DESC 
            LIMIT 10
        `);
        const top10 = stmt.all() as SkillsStandingRow[];

        console.log('\nTop 10 Teams:');
        console.log('-------------');
        top10.forEach((team) => {
            console.log(`${team.rank}. ${team.team_number} - ${team.team_name}`);
            console.log(`   Score: ${team.score} (Autonomous: ${team.autonomous_skills}, Driver: ${team.driver_skills})`);
            console.log(`   Organization: ${team.organization}`);
            console.log('-------------');
        });

        // Close the database
        db.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the test
main(); 