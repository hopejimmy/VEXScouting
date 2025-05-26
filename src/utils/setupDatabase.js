const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Database setup
const dbPath = path.join(dataDir, 'skills.db');
const db = new Database(dbPath);

// Create table
const createTableSQL = `
    CREATE TABLE IF NOT EXISTS skills_standings (
        rank INTEGER,
        score INTEGER,
        autonomousSkills INTEGER,
        driverSkills INTEGER,
        highestAutonomousSkills INTEGER,
        highestDriverSkills INTEGER,
        highestAutonomousTimestamp TEXT,
        highestDriverTimestamp TEXT,
        highestAutonomousStopTime INTEGER,
        highestDriverStopTime INTEGER,
        teamNumber TEXT PRIMARY KEY,
        teamName TEXT,
        organization TEXT,
        eventRegion TEXT,
        country TEXT
    )
`;

db.exec(createTableSQL);

// Prepare insert statement
const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO skills_standings (
        rank, score, autonomousSkills, driverSkills,
        highestAutonomousSkills, highestDriverSkills,
        highestAutonomousTimestamp, highestDriverTimestamp,
        highestAutonomousStopTime, highestDriverStopTime,
        teamNumber, teamName, organization, eventRegion, country
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Simple CSV parser
function parseCSV(csvContent) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        results.push(row);
    }
    
    return results;
}

// Function to process CSV file
function processCSV(csvPath) {
    try {
        console.log(`Reading CSV file: ${csvPath}`);
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const data = parseCSV(csvContent);
        
        const results = data.map(row => ({
            rank: parseInt(row['Rank']) || 0,
            score: parseInt(row['Score']) || 0,
            autonomousSkills: parseInt(row['Autonomous Coding Skills']) || 0,
            driverSkills: parseInt(row['Driver Skills']) || 0,
            highestAutonomousSkills: parseInt(row['Highest Autonomous Coding Skills']) || 0,
            highestDriverSkills: parseInt(row['Highest Driver Skills']) || 0,
            highestAutonomousTimestamp: row['Highest Autonomous Score Timestamp'] || '',
            highestDriverTimestamp: row['Highest Driver Score Timestamp'] || '',
            highestAutonomousStopTime: parseInt(row['Highest Autonomous Score Stop Time']) || 0,
            highestDriverStopTime: parseInt(row['Highest Driver Score Stop Time']) || 0,
            teamNumber: row['Team Number'] || '',
            teamName: row['Team Name'] || '',
            organization: row['Organization'] || '',
            eventRegion: row['Event Region'] || '',
            country: row['Country / Region'] || ''
        }));
        
        console.log(`Processed ${results.length} rows from CSV`);
        return results;
    } catch (error) {
        console.error('Error processing CSV:', error);
        throw error;
    }
}

// Main function
function setupDatabase() {
    try {
        console.log('Setting up database...');
        
        // Find the CSV file
        const csvPath = path.join(__dirname, '../../public/data/skills-standings (1).csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV file not found at ${csvPath}`);
        }
        
        const data = processCSV(csvPath);
        
        console.log('Inserting data into database...');
        const insertMany = db.transaction((rows) => {
            for (const row of rows) {
                insertStmt.run(
                    row.rank, row.score, row.autonomousSkills, row.driverSkills,
                    row.highestAutonomousSkills, row.highestDriverSkills,
                    row.highestAutonomousTimestamp, row.highestDriverTimestamp,
                    row.highestAutonomousStopTime, row.highestDriverStopTime,
                    row.teamNumber, row.teamName, row.organization, row.eventRegion, row.country
                );
            }
        });
        
        insertMany(data);
        
        console.log(`✅ Database setup complete! Inserted ${data.length} teams.`);
        console.log(`📁 Database location: ${dbPath}`);
        
        // Test query
        const count = db.prepare('SELECT COUNT(*) as count FROM skills_standings').get();
        console.log(`📊 Total teams in database: ${count.count}`);
        
        db.close();
        
    } catch (error) {
        console.error('❌ Error setting up database:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase }; 