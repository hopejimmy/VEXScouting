const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection
const dbPath = path.join(__dirname, '../../data/skills.db');
const db = new Database(dbPath);

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