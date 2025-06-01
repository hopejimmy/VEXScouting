import express from 'express';
import cors from 'cors';
import pg from 'pg';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../..', '.env') });

// Debug: Print environment variables (excluding sensitive data)
console.log('Environment variables loaded:', {
  CURRENT_SEASON_ID: process.env.CURRENT_SEASON_ID,
  hasApiToken: !!process.env.ROBOTEVENTS_API_TOKEN
});

const app = express();
const PORT = process.env.PORT || 3000;
const { Pool } = pg;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'vexscouting',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

// Initialize database schema
async function initializeDatabase() {
  try {
    await pool.query(`
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
        matchType TEXT DEFAULT 'VRC',
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add the matchType column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE skills_standings 
      ADD COLUMN IF NOT EXISTS matchType TEXT DEFAULT 'VRC'
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
}

// Initialize database on startup
initializeDatabase();

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// API Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Get matchType from request body, default to 'VRC'
  const matchType = req.body.matchType || 'VRC';

  // Validate matchType
  const validMatchTypes = ['VRC', 'VEXIQ', 'VEXU'];
  if (!validMatchTypes.includes(matchType)) {
    return res.status(400).json({ error: 'Invalid match type. Must be one of: VRC, VEXIQ, VEXU' });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await pool.query('BEGIN');

        for (const record of results) {
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
            matchType: matchType
          };

          // Upsert query using ON CONFLICT
          await pool.query(`
            INSERT INTO skills_standings (
              teamNumber, teamName, organization, eventRegion, countryRegion,
              rank, score, autonomousSkills, driverSkills,
              highestAutonomousSkills, highestDriverSkills, matchType
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (teamNumber) DO UPDATE SET
              teamName = EXCLUDED.teamName,
              organization = EXCLUDED.organization,
              eventRegion = EXCLUDED.eventRegion,
              countryRegion = EXCLUDED.countryRegion,
              rank = EXCLUDED.rank,
              score = EXCLUDED.score,
              autonomousSkills = EXCLUDED.autonomousSkills,
              driverSkills = EXCLUDED.driverSkills,
              highestAutonomousSkills = EXCLUDED.highestAutonomousSkills,
              highestDriverSkills = EXCLUDED.highestDriverSkills,
              matchType = EXCLUDED.matchType,
              lastUpdated = CURRENT_TIMESTAMP
          `, [
            mappedRecord.teamNumber,
            mappedRecord.teamName,
            mappedRecord.organization,
            mappedRecord.eventRegion,
            mappedRecord.countryRegion,
            mappedRecord.rank,
            mappedRecord.score,
            mappedRecord.autonomousSkills,
            mappedRecord.driverSkills,
            mappedRecord.highestAutonomousSkills,
            mappedRecord.highestDriverSkills,
            mappedRecord.matchType
          ]);
        }

        await pool.query('COMMIT');
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({ 
          message: `CSV data processed successfully for ${matchType}`,
          recordsProcessed: results.length,
          matchType: matchType
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error('CSV processing error:', error);
        res.status(500).json({ error: 'Error processing CSV file' });
      }
    });
});

// Get all teams
app.get('/api/teams', async (req, res) => {
  try {
    const { matchType } = req.query;
    
    let query = 'SELECT * FROM skills_standings';
    let params = [];
    
    if (matchType) {
      query += ' WHERE matchtype = $1';
      params.push(matchType);
    }
    
    query += ' ORDER BY rank';
    
    const result = await pool.query(query, params);
    
    // Transform the response to use camelCase property names
    const teams = result.rows.map(team => ({
      teamNumber: team.teamnumber,
      teamName: team.teamname,
      organization: team.organization,
      eventRegion: team.eventregion,
      city: team.eventregion?.split(',')[0]?.trim() || '',
      country: team.countryregion || '',
      countryRegion: team.countryregion,
      rank: team.rank,
      score: team.score,
      autonomousSkills: team.autonomousskills,
      driverSkills: team.driverskills,
      highestAutonomousSkills: team.highestautonomousskills,
      highestDriverSkills: team.highestdriverskills,
      highestAutonomousTimestamp: team.highestautonomoustimestamp,
      highestDriverTimestamp: team.highestdrivertimestamp,
      highestAutonomousStopTime: team.highestautonomousstoptime,
      highestDriverStopTime: team.highestdriverstoptime,
      matchType: team.matchtype || 'VRC',
      lastUpdated: team.lastupdated
    }));
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Error fetching teams' });
  }
});

// Get team by number
app.get('/api/teams/:teamNumber', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM skills_standings WHERE teamNumber = $1', [req.params.teamNumber]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Team not found' });
    } else {
      // Transform the response to use camelCase property names
      const team = {
        teamNumber: result.rows[0].teamnumber,
        teamName: result.rows[0].teamname,
        organization: result.rows[0].organization,
        eventRegion: result.rows[0].eventregion,
        city: result.rows[0].eventregion?.split(',')[0]?.trim() || '',
        country: result.rows[0].countryregion || '',
        countryRegion: result.rows[0].countryregion,
        rank: result.rows[0].rank,
        score: result.rows[0].score,
        autonomousSkills: result.rows[0].autonomousskills,
        driverSkills: result.rows[0].driverskills,
        highestAutonomousSkills: result.rows[0].highestautonomousskills,
        highestDriverSkills: result.rows[0].highestdriverskills,
        highestAutonomousTimestamp: result.rows[0].highestautonomoustimestamp,
        highestDriverTimestamp: result.rows[0].highestdrivertimestamp,
        highestAutonomousStopTime: result.rows[0].highestautonomousstoptime,
        highestDriverStopTime: result.rows[0].highestdriverstoptime,
        matchType: result.rows[0].matchtype || 'VRC',
        lastUpdated: result.rows[0].lastupdated
      };
      res.json(team);
    }
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Error fetching team' });
  }
});

// Search teams
app.get('/api/search', async (req, res) => {
  const { q, matchType } = req.query;
  try {
    let query = 'SELECT * FROM skills_standings WHERE (teamNumber ILIKE $1 OR teamName ILIKE $1)';
    let params = [`%${q}%`];
    
    if (matchType) {
      query += ' AND matchtype = $2';  // Use lowercase 'matchtype' column name
      params.push(matchType);
    }
    
    query += ' ORDER BY rank';
    
    const result = await pool.query(query, params);
    
    // Transform the response to use camelCase property names
    const teams = result.rows.map(team => ({
      teamNumber: team.teamnumber,
      teamName: team.teamname,
      organization: team.organization,
      eventRegion: team.eventregion,
      city: team.eventregion?.split(',')[0]?.trim() || '',
      country: team.countryregion || '',
      countryRegion: team.countryregion,
      rank: team.rank,
      score: team.score,
      autonomousSkills: team.autonomousskills,
      driverSkills: team.driverskills,
      highestAutonomousSkills: team.highestautonomousskills,
      highestDriverSkills: team.highestdriverskills,
      highestAutonomousTimestamp: team.highestautonomoustimestamp,
      highestDriverTimestamp: team.highestdrivertimestamp,
      highestAutonomousStopTime: team.highestautonomousstoptime,
      highestDriverStopTime: team.highestdriverstoptime,
      matchType: team.matchtype || 'VRC',
      lastUpdated: team.lastupdated
    }));
    
    res.json({ teams, total: teams.length });
  } catch (error) {
    console.error('Error searching teams:', error);
    res.status(500).json({ error: 'Error searching teams' });
  }
});

// Get team events for the current season
app.get('/api/teams/:teamNumber/events', async (req, res) => {
  try {
    const { teamNumber } = req.params;
    const { season } = req.query;
    
    // Get the current season ID and API token from environment
    const seasonId = season || process.env.CURRENT_SEASON_ID || '190'; // Use query param or default to High Stakes
    const apiToken = process.env.ROBOTEVENTS_API_TOKEN;

    console.log('Using season ID:', seasonId); // Debug log

    if (!apiToken) {
      throw new Error('RobotEvents API token not configured');
    }

    // First get the team ID by searching for the team
    const teamResponse = await fetch(
      `https://www.robotevents.com/api/v2/teams?number[]=${encodeURIComponent(teamNumber.toUpperCase())}&program[]=1`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!teamResponse.ok) {
      const errorData = await teamResponse.json();
      console.log('Team search response:', await teamResponse.text());  // Debug log
      throw new Error(`RobotEvents API error: ${errorData.message || 'Failed to fetch team'}`);
    }

    const teamData = await teamResponse.json();
    console.log('Team search result:', teamData);  // Debug log
    
    if (!teamData.data || teamData.data.length === 0) {
      throw new Error('Team not found');
    }

    const team = teamData.data[0];
    
    // Get events for the specified season
    console.log(`Fetching events for team ${team.id} and season ${seasonId}`);
    
    const eventsResponse = await fetch(
      `https://www.robotevents.com/api/v2/teams/${team.id}/events?season[]=${seasonId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!eventsResponse.ok) {
      const errorData = await eventsResponse.json();
      console.log('Events response error:', errorData);
      throw new Error(`RobotEvents API error: ${errorData.message || 'Failed to fetch events'}`);
    }

    const eventsData = await eventsResponse.json();
    console.log('Events data:', JSON.stringify(eventsData, null, 2));
    
    // Transform and sort events
    const events = (eventsData.data || []).map(event => {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const now = new Date();
      return {
        id: event.id,
        name: event.name,
        start: event.start,
        end: event.end,
        season: event.season,
        location: {
          venue: event.location.venue,
          city: event.location.city,
          region: event.location.region,
          country: event.location.country,
        },
        divisions: event.divisions.map(d => d.name),
        level: event.level,
        upcoming: startDate > now, // Event is upcoming only if it hasn't started yet
        type: event.event_type,
      };
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching team events:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint: Get awards for a team at a specific event
app.get('/api/teams/:teamNumber/events/:eventId/awards', async (req, res) => {
  try {
    const { teamNumber, eventId } = req.params;
    const apiToken = process.env.ROBOTEVENTS_API_TOKEN;

    if (!apiToken) {
      throw new Error('RobotEvents API token not configured');
    }

    // First get the team ID by searching for the team
    const teamResponse = await fetch(
      `https://www.robotevents.com/api/v2/teams?number[]=${encodeURIComponent(teamNumber.toUpperCase())}&program[]=1`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!teamResponse.ok) {
      const errorData = await teamResponse.json();
      throw new Error(`RobotEvents API error: ${errorData.message || 'Failed to fetch team'}`);
    }

    const teamData = await teamResponse.json();
    
    if (!teamData.data || teamData.data.length === 0) {
      return res.json([]); // Return empty array if team not found
    }

    const team = teamData.data[0];
    
    // Get awards for the team at the specific event
    const awardsResponse = await fetch(
      `https://www.robotevents.com/api/v2/events/${eventId}/awards?team[]=${team.id}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!awardsResponse.ok) {
      // If awards endpoint fails, return empty array (some events might not have awards)
      console.log(`No awards found for team ${teamNumber} at event ${eventId}`);
      return res.json([]);
    }

    const awardsData = await awardsResponse.json();
    
    // Transform awards data
    const awards = (awardsData.data || []).map(award => ({
      id: award.id,
      title: award.title,
      qualifications: award.qualifications || [],
      placement: award.order || 1, // Some awards don't have placement
      eventId: parseInt(eventId),
      teamId: team.id
    }));
    
    res.json(awards);
  } catch (error) {
    console.error('Error fetching team awards:', error);
    // Return empty array instead of error to avoid breaking UI
    res.json([]);
  }
});

// Get VRC seasons
app.get('/api/seasons', async (req, res) => {
  try {
    const apiToken = process.env.ROBOTEVENTS_API_TOKEN;

    if (!apiToken) {
      throw new Error('RobotEvents API token not configured');
    }

    const response = await fetch(
      'https://www.robotevents.com/api/v2/seasons?program[]=1', // Filter for VRC program
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`RobotEvents API error: ${errorData.message || 'Failed to fetch seasons'}`);
    }

    const data = await response.json();
    
    // Transform and sort seasons (most recent first)
    const seasons = data.data
      .map(season => ({
        id: season.id,
        name: season.name,
        start: season.start,
        end: season.end
      }))
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

    res.json(seasons);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available programs/match types
app.get('/api/programs', async (req, res) => {
  try {
    const apiToken = process.env.ROBOTEVENTS_API_TOKEN;

    if (!apiToken) {
      throw new Error('RobotEvents API token not configured');
    }

    const response = await fetch(
      'https://www.robotevents.com/api/v2/programs',
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`RobotEvents API error: ${errorData.message || 'Failed to fetch programs'}`);
    }

    const data = await response.json();
    
    // Filter for VEX programs and transform
    const vexPrograms = data.data
      .filter(program => program.name.includes('VEX'))
      .map(program => ({
        id: program.id,
        name: program.name,
        code: program.code || getMatchTypeFromName(program.name)
      }));

    res.json(vexPrograms);
  } catch (error) {
    console.error('Error fetching programs:', error);
    // Return default programs if API fails
    res.json([
      { id: 1, name: 'VEX V5 Robotics Competition', code: 'VRC' },
      { id: 4, name: 'VEX IQ Robotics Competition', code: 'VEXIQ' },
      { id: 41, name: 'VEX U Robotics Competition', code: 'VEXU' }
    ]);
  }
});

// Helper function to extract match type from program name
function getMatchTypeFromName(programName) {
  if (programName.includes('VEX IQ') || programName.includes('VEXIQ')) return 'VEXIQ';
  if (programName.includes('VEX U') || programName.includes('VEXU')) return 'VEXU';
  if (programName.includes('VEX V5') || programName.includes('VRC')) return 'VRC';
  return 'VRC'; // Default
}

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
  pool.end();
  console.log('Database connection closed.');
  process.exit(0);
}); 