const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const Database = require('better-sqlite3');
const multer = require('multer');
const csv = require('csv-parse');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for CSV file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '../../uploads'))
        },
        filename: function (req, file, cb) {
            cb(null, 'teams-' + Date.now() + '.csv')
        }
    }),
    fileFilter: function (req, file, cb) {
        if (file.mimetype !== 'text/csv') {
            return cb(new Error('Only CSV files are allowed'));
        }
        cb(null, true);
    }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection and initialization
const dbPath = path.join(__dirname, '../../data/skills.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
    CREATE TABLE IF NOT EXISTS skills_standings (
        teamNumber TEXT PRIMARY KEY,
        teamName TEXT,
        organization TEXT,
        eventRegion TEXT,
        countryRegion TEXT,
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
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

// API Routes
app.get('/api/teams/search', (req, res) => {
    try {
        const query = req.query.q;
        
        if (!query || query.trim().length === 0) {
            return res.json({ teams: [], total: 0 });
        }

        const searchTerm = `%${query.trim()}%`;
        
        const sql = `
            SELECT * FROM skills_standings 
            WHERE teamNumber LIKE ? OR teamName LIKE ? 
            ORDER BY rank ASC 
            LIMIT 50
        `;
        
        try {
            const rows = db.prepare(sql).all(searchTerm, searchTerm);
            res.json({
                teams: rows,
                total: rows.length
            });
        } catch (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/teams/top', (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '10');
        
        const sql = `
            SELECT * FROM skills_standings 
            ORDER BY rank ASC 
            LIMIT ?
        `;
        
        try {
            const rows = db.prepare(sql).all(limit);
            res.json({
                teams: rows,
                total: rows.length
            });
        } catch (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
    } catch (error) {
        console.error('Top teams error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/teams/:teamNumber', (req, res) => {
    try {
        const { teamNumber } = req.params;
        
        const sql = `
            SELECT * FROM skills_standings 
            WHERE teamNumber = ?
        `;
        
        try {
            const row = db.prepare(sql).get(teamNumber);
            
            if (!row) {
                return res.status(404).json({ error: 'Team not found' });
            }
            
            res.json(row);
        } catch (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
    } catch (error) {
        console.error('Team details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// New route for CSV upload and processing
app.post('/api/teams/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const results = [];
        const parser = fs.createReadStream(req.file.path)
            .pipe(csv.parse({
                columns: true,
                skip_empty_lines: true
            }));

        for await (const record of parser) {
            // Map the VEX skills standings CSV format to our database format
            const mappedRecord = {
                rank: parseInt(record['Rank']) || 0,
                score: parseInt(record['Score']) || 0,
                autonomousSkills: parseInt(record['Autonomous Coding Skills']) || 0,
                driverSkills: parseInt(record['Driver Skills']) || 0,
                highestAutonomousSkills: parseInt(record['Highest Autonomous Coding Skills']) || 0,
                highestDriverSkills: parseInt(record['Highest Driver Skills']) || 0,
                teamNumber: record['Team Number'],
                teamName: record['Team Name'],
                organization: record['Organization'],
                eventRegion: record['Event Region'] || '',
                countryRegion: record['Country / Region'] || '',
                highestAutonomousTimestamp: record['Highest Autonomous Score Timestamp'] || '',
                highestDriverTimestamp: record['Highest Driver Score Timestamp'] || '',
                highestAutonomousStopTime: parseInt(record['Highest Autonomous Score Stop Time']) || 0,
                highestDriverStopTime: parseInt(record['Highest Driver Score Stop Time']) || 0
            };

            // Validate required fields
            if (!mappedRecord.teamNumber || !mappedRecord.teamName) {
                console.warn('Skipping record due to missing required fields:', record);
                continue;
            }

            results.push(mappedRecord);
        }

        // Begin transaction
        const transaction = db.transaction((teams) => {
            const insertStmt = db.prepare(`
                INSERT INTO skills_standings (
                    teamNumber, teamName, organization, eventRegion, countryRegion,
                    rank, score, autonomousSkills, driverSkills,
                    highestAutonomousSkills, highestDriverSkills,
                    highestAutonomousTimestamp, highestDriverTimestamp,
                    highestAutonomousStopTime, highestDriverStopTime
                ) VALUES (
                    @teamNumber, @teamName, @organization, @eventRegion, @countryRegion,
                    @rank, @score, @autonomousSkills, @driverSkills,
                    @highestAutonomousSkills, @highestDriverSkills,
                    @highestAutonomousTimestamp, @highestDriverTimestamp,
                    @highestAutonomousStopTime, @highestDriverStopTime
                ) ON CONFLICT(teamNumber) DO UPDATE SET
                    teamName = @teamName,
                    organization = @organization,
                    eventRegion = @eventRegion,
                    countryRegion = @countryRegion,
                    rank = @rank,
                    score = @score,
                    autonomousSkills = @autonomousSkills,
                    driverSkills = @driverSkills,
                    highestAutonomousSkills = @highestAutonomousSkills,
                    highestDriverSkills = @highestDriverSkills,
                    highestAutonomousTimestamp = @highestAutonomousTimestamp,
                    highestDriverTimestamp = @highestDriverTimestamp,
                    highestAutonomousStopTime = @highestAutonomousStopTime,
                    highestDriverStopTime = @highestDriverStopTime
            `);

            for (const team of teams) {
                insertStmt.run(team);
            }
        });

        // Execute transaction
        transaction(results);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            message: `Successfully processed ${results.length} teams`,
            processed: results.length
        });

    } catch (error) {
        console.error('CSV processing error:', error);
        // Clean up uploaded file in case of error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Error processing CSV file' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close();
    console.log('Database connection closed.');
    process.exit(0);
}); 