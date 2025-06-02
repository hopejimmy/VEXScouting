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
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../..', '.env') });

// Debug: Print environment variables (excluding sensitive data)
console.log('Environment variables loaded:', {
  CURRENT_SEASON_ID: process.env.CURRENT_SEASON_ID,
  hasApiToken: !!process.env.ROBOTEVENTS_API_TOKEN,
  hasJwtSecret: !!process.env.JWT_SECRET
});

const app = express();
const PORT = process.env.PORT || 3000;
const { Pool } = pg;

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://localhost:3001', 'http://localhost:3001']
    : ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Role-based authorization middleware
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// PostgreSQL connection configuration
const pool = new Pool(
  process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'vexscouting',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
      }
);

// Initialize database schema
async function initializeDatabase() {
  try {
    // Create skills_standings table
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

    // Create authentication tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        resource VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id INTEGER REFERENCES roles(id),
        active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    // Insert default roles if they don't exist
    await pool.query(`
      INSERT INTO roles (name, description) VALUES 
      ('admin', 'Full access to all features including user management')
      ON CONFLICT (name) DO NOTHING
    `);

    await pool.query(`
      INSERT INTO roles (name, description) VALUES 
      ('guest', 'Basic access excluding upload and user management')
      ON CONFLICT (name) DO NOTHING
    `);

    // Insert default permissions if they don't exist
    const permissions = [
      ['teams:search', 'Search and view teams', 'teams', 'search'],
      ['teams:compare', 'Compare teams', 'teams', 'compare'],
      ['teams:favorites', 'Manage favorite teams', 'teams', 'favorites'],
      ['upload:create', 'Upload data files', 'upload', 'create'],
      ['users:read', 'View users', 'users', 'read'],
      ['users:create', 'Create users', 'users', 'create'],
      ['users:update', 'Update users', 'users', 'update'],
      ['users:delete', 'Delete users', 'users', 'delete'],
      ['roles:read', 'View roles', 'roles', 'read'],
      ['roles:create', 'Create roles', 'roles', 'create'],
      ['roles:update', 'Update roles', 'roles', 'update'],
      ['roles:delete', 'Delete roles', 'roles', 'delete'],
      ['admin:access', 'Access admin panel', 'admin', 'access'],
      ['admin:users', 'Manage users in admin panel', 'admin', 'users'],
      ['admin:roles', 'Manage roles in admin panel', 'admin', 'roles'],
      ['admin:settings', 'Manage system settings', 'admin', 'settings'],
      ['admin:database', 'View database status', 'admin', 'database']
    ];

    for (const [name, description, resource, action] of permissions) {
      await pool.query(`
        INSERT INTO permissions (name, description, resource, action) VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO NOTHING
      `, [name, description, resource, action]);
    }

    // Get role IDs
    const adminRole = await pool.query(`SELECT id FROM roles WHERE name = 'admin'`);
    const guestRole = await pool.query(`SELECT id FROM roles WHERE name = 'guest'`);

    if (adminRole.rows.length > 0 && guestRole.rows.length > 0) {
      const adminRoleId = adminRole.rows[0].id;
      const guestRoleId = guestRole.rows[0].id;

      // Assign all permissions to admin role
      const allPermissions = await pool.query(`SELECT id FROM permissions`);
      for (const permission of allPermissions.rows) {
        await pool.query(`
          INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [adminRoleId, permission.id]);
      }

      // Assign limited permissions to guest role
      const guestPermissions = await pool.query(`
        SELECT id FROM permissions WHERE name IN ('teams:search', 'teams:compare', 'teams:favorites')
      `);
      for (const permission of guestPermissions.rows) {
        await pool.query(`
          INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [guestRoleId, permission.id]);
      }

      // Create default admin user if it doesn't exist
      const adminExists = await pool.query(`SELECT id FROM users WHERE username = $1`, [
        process.env.ADMIN_USERNAME || 'admin'
      ]);

      if (adminExists.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 10);
        await pool.query(`
          INSERT INTO users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4)
        `, [
          process.env.ADMIN_USERNAME || 'admin',
          process.env.ADMIN_EMAIL || 'admin@vexscouting.com',
          hashedPassword,
          adminRoleId
        ]);
        console.log('Default admin user created');
      }
    }

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
}

// Initialize database on startup
initializeDatabase();

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Helper function to validate password strength
function validatePassword(password) {
  const minLength = 6;
  const hasNumber = /\d/;
  const hasUpperCase = /[A-Z]/;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;

  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  if (!hasNumber.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!hasUpperCase.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasSpecialChar.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

// Authentication Routes

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get user with role information
    const result = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.username = $1 AND u.active = true
    `, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);

    // Get user permissions
    const permissionsResult = await pool.query(`
      SELECT p.name, p.resource, p.action 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `, [user.role_id]);

    const permissions = permissionsResult.rows.map(p => p.name);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: user.role_name,
        permissions: permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name,
        permissions: permissions,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    // Get fresh user data
    const result = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = $1 AND u.active = true
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = result.rows[0];

    // Get current permissions
    const permissionsResult = await pool.query(`
      SELECT p.name, p.resource, p.action 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `, [user.role_id]);

    const permissions = permissionsResult.rows.map(p => p.name);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_name,
        permissions: permissions,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint (client-side token removal, but we can log it)
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // We could add token blacklisting here if needed
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API Routes

// Protected upload endpoint - requires admin role
app.post('/api/upload', authenticateToken, requireRole('admin'), upload.single('file'), async (req, res) => {
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
      console.log('Team search response error:', errorData);  // Fixed: use errorData instead of re-reading body
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

// Admin Routes - All require admin role

// Get all users
app.get('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.active, u.last_login, u.created_at, u.updated_at,
             r.name as role_name, r.id as role_id
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);

    const users = result.rows.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: {
        id: user.role_id,
        name: user.role_name
      },
      active: user.active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Create new user
app.post('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, roleId } = req.body;

    if (!username || !email || !password || !roleId) {
      return res.status(400).json({ error: 'Username, email, password, and role are required' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Check if username or email already exists
    const existingUser = await pool.query(`
      SELECT id FROM users WHERE username = $1 OR email = $2
    `, [username, email]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Verify role exists
    const roleExists = await pool.query(`SELECT id FROM roles WHERE id = $1`, [roleId]);
    if (roleExists.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, active, created_at
    `, [username, email, hashedPassword, roleId]);

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Update user
app.put('/api/admin/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, roleId, active, password } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (roleId !== undefined) {
      updates.push(`role_id = $${paramCount++}`);
      values.push(roleId);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(active);
    }
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.message });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, active, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error updating user' });
  }
});

// Delete user (soft delete by setting active = false)
app.delete('/api/admin/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting yourself
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query(`
      UPDATE users 
      SET active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, username
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deactivated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
});

// Get all roles with their permissions
app.get('/api/admin/roles', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.name, r.description, r.active, r.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', p.id,
                   'name', p.name,
                   'description', p.description,
                   'resource', p.resource,
                   'action', p.action
                 )
               ) FILTER (WHERE p.id IS NOT NULL), 
               '[]'
             ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.active = true
      GROUP BY r.id, r.name, r.description, r.active, r.created_at
      ORDER BY r.created_at ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Error fetching roles' });
  }
});

// Get all permissions
app.get('/api/admin/permissions', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, resource, action, created_at
      FROM permissions
      ORDER BY resource, action
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Error fetching permissions' });
  }
});

// Update role permissions
app.put('/api/admin/roles/:id/permissions', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const roleId = req.params.id;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'permissionIds must be an array' });
    }

    await pool.query('BEGIN');

    // Remove existing permissions
    await pool.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

    // Add new permissions
    for (const permissionId of permissionIds) {
      await pool.query(`
        INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
      `, [roleId, permissionId]);
    }

    await pool.query('COMMIT');

    res.json({ message: 'Role permissions updated successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Error updating role permissions' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint for debugging
app.get('/', (req, res) => {
  res.json({ 
    message: 'VEX Scouting API Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      teams: '/api/search',
      programs: '/api/programs',
      admin: '/api/admin/*'
    }
  });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'VEX Scouting API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health - Health check',
      'GET /api/programs - Get competition programs',
      'GET /api/search - Search teams',
      'GET /api/teams/:number - Get team details',
      'POST /api/login - User login',
      'POST /api/logout - User logout',
      'GET /api/admin/* - Admin endpoints (requires authentication)'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler - This must be LAST
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 API endpoints available at http://0.0.0.0:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected via DATABASE_URL' : 'Local connection'}`);
});

// Handle server startup errors
server.on('error', (err) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  pool.end();
  console.log('Database connection closed.');
  process.exit(0);
}); 