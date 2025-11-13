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
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CURRENT_SEASON_ID: process.env.CURRENT_SEASON_ID,
  hasApiToken: !!process.env.ROBOTEVENTS_API_TOKEN,
  hasJwtSecret: !!process.env.JWT_SECRET,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasPostgresHost: !!process.env.POSTGRES_HOST
});

const app = express();
const PORT = process.env.PORT || 3000;
const { Pool } = pg;

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3001',
      'http://localhost:3000', 
      'http://127.0.0.1:3001',
      'https://localhost:3001'
    ];
    
    if (process.env.NODE_ENV === 'production') {
      // Add production frontend URL if configured
      if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
      }
      
      // Allow all Vercel deployment URLs (both main and preview deployments)
      if (origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      // Allow custom domains
      if (origin.includes('vexscouting.ca')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
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

// PostgreSQL connection configuration with Railway support
let pool;
try {
  if (process.env.DATABASE_URL) {
    // Production/Railway environment - use DATABASE_URL
    console.log('🔗 Using Railway DATABASE_URL connection string');
    console.log('🌍 Environment: production');
    console.log('🔗 Database: Railway PostgreSQL');
    
    // Check if using Railway's private network
    const isPrivateNetwork = process.env.DATABASE_URL.includes('railway.internal');
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isPrivateNetwork ? false : {
        rejectUnauthorized: false // Required for Railway's SSL certificates
      },
      connectionTimeoutMillis: 10000, // 10 second timeout
      idleTimeoutMillis: 30000, // 30 seconds idle before closing connection
      max: 20 // Maximum pool size
    });
  } else if (process.env.POSTGRES_HOST) {
    // Development environment - use individual variables
    console.log('🔗 Using individual database environment variables');
    console.log('🌍 Environment: development');
    console.log('🔗 Database: Local connection');
    
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'vexscouting',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      ssl: false // No SSL for local development
    });
  } else {
    // Fallback to default local PostgreSQL
    console.log('🔗 Using default local PostgreSQL configuration');
    console.log('🌍 Environment: development (fallback)');
    console.log('🔗 Database: Local default');
    
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'vexscouting',
      user: 'postgres',
      password: 'postgres',
      ssl: false
    });
  }
} catch (error) {
  console.error('❌ Database pool creation error:', error);
  throw new Error(`Database configuration failed: ${error.message}`);
}

// Test database connection with better error handling
async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Please check your database configuration and ensure the database server is running');
    
    if (process.env.DATABASE_URL) {
      console.error('🔧 Railway DATABASE_URL format should be: postgresql://user:password@host:port/database');
    } else {
      console.error('🔧 For local development, ensure PostgreSQL is running on localhost:5432');
    }
    
    return false;
  }
}

// Initialize database schema
async function initializeDatabase() {
  try {
    console.log('📊 Initializing database schema...');
    
    // First test the connection
    const connected = await testDatabaseConnection();
    if (!connected) {
      throw new Error('Database connection test failed');
    }

    // Create skills_standings table with composite primary key
    await pool.query(`
      CREATE TABLE IF NOT EXISTS skills_standings (
        teamNumber TEXT NOT NULL,
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
        matchType TEXT NOT NULL DEFAULT 'VRC',
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (teamNumber, matchType)
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

    // Assign all permissions to admin role
    const adminRoleResult = await pool.query(`SELECT id FROM roles WHERE name = 'admin'`);
    const permissionsResult = await pool.query(`SELECT id FROM permissions`);
    
    if (adminRoleResult.rows.length > 0) {
      const adminRoleId = adminRoleResult.rows[0].id;
      for (const permission of permissionsResult.rows) {
        await pool.query(`
          INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [adminRoleId, permission.id]);
      }
    }

    // Assign basic permissions to guest role
    const guestRoleResult = await pool.query(`SELECT id FROM roles WHERE name = 'guest'`);
    const basicPermissions = ['teams:search', 'teams:compare', 'teams:favorites'];
    
    if (guestRoleResult.rows.length > 0) {
      const guestRoleId = guestRoleResult.rows[0].id;
      for (const permName of basicPermissions) {
        const permResult = await pool.query(`SELECT id FROM permissions WHERE name = $1`, [permName]);
        if (permResult.rows.length > 0) {
          await pool.query(`
            INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, [guestRoleId, permResult.rows[0].id]);
        }
      }
    }

    // Create default admin user if no admin exists
    const adminCheck = await pool.query(`
      SELECT u.* FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name = 'admin' AND u.active = true
    `);

    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123!', 10);
      const adminRoleId = adminRoleResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role_id, active)
        VALUES ('admin', 'admin@vexscouting.com', $1, $2, true)
      `, [hashedPassword, adminRoleId]);
      
      console.log('Default admin user created');
    }

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
    throw error; // Re-throw to handle at startup level
  }
}

// Initialize database on startup with proper error handling
async function startApplication() {
  try {
    await initializeDatabase();
    console.log('🎉 Application initialization completed successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('⚠️  Server will continue to run, but database operations may fail');
    console.error('🔧 Please check your database configuration and environment variables');
    
    // In production, we might want to fail fast, but for debugging we'll continue
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DB_FAIL) {
      console.error('💥 Exiting due to database connection failure in production');
      process.exit(1);
    }
  }
}

// Start server with proper error handling
async function startServer() {
  try {
    // Initialize database first
    await startApplication();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 API endpoints available at http://0.0.0.0:${PORT}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Railway PostgreSQL' : 'Local connection'}`);
    });

    // Handle server startup errors
    server.on('error', (err) => {
      console.error('❌ Server startup error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`🔧 Port ${PORT} is already in use. Please close other applications using this port or change the PORT environment variable.`);
      }
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      pool.end();
      console.log('Database connection closed.');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      pool.end();
      console.log('Database connection closed.');
      process.exit(0);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

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

          // Upsert query using ON CONFLICT with composite key
          await pool.query(`
            INSERT INTO skills_standings (
              teamNumber, teamName, organization, eventRegion, countryRegion,
              rank, score, autonomousSkills, driverSkills,
              highestAutonomousSkills, highestDriverSkills, matchType
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (teamNumber, matchType) DO UPDATE SET
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

// Get event rankings - teams in a specific event with their world rankings
app.get('/api/events/:eventId/rankings', async (req, res) => {
  const { eventId } = req.params;
  const { matchType, grade } = req.query; // Add grade filter
  
  try {
    const apiToken = process.env.ROBOTEVENTS_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'RobotEvents API token not configured' });
    }
    
    // Step 1: Fetch ALL teams registered for this event from RobotEvents API (with pagination)
    let allTeams = [];
    let eventInfo = null;
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const teamsResponse = await fetch(
        `https://www.robotevents.com/api/v2/events/${eventId}/teams?page=${currentPage}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!teamsResponse.ok) {
        throw new Error(`RobotEvents API error: ${teamsResponse.status}`);
      }
      
      const teamsData = await teamsResponse.json();
      
      // Store event info from first page
      if (currentPage === 1) {
        eventInfo = teamsData.meta?.event;
      }
      
      // Add teams from this page
      const pageTeams = teamsData.data || [];
      allTeams = allTeams.concat(pageTeams);
      
      // Check if there are more pages
      const meta = teamsData.meta || {};
      hasMorePages = meta.current_page < meta.last_page;
      currentPage++;
    }
    
    console.log(`Fetched ${allTeams.length} teams for event ${eventId} across ${currentPage - 1} page(s)`);
    
    const validGrades = ['High School', 'Middle School', 'Elementary School'];

    // Create a map of team number to grade
    const teamGradeMap = {};
    allTeams.forEach(team => {
      teamGradeMap[team.number] = team.grade || 'Unknown';
    });
    
    // Filter by grade if specified
    let filteredTeams = allTeams;
    if (grade) {
      if (validGrades.includes(grade)) {
        filteredTeams = allTeams.filter(team => team.grade === grade);
        console.log(`Filtered to ${filteredTeams.length} ${grade} teams out of ${allTeams.length} total`);
      }
    }
    
    // Extract team numbers
    const teamNumbers = filteredTeams.map(team => team.number);
    
    if (teamNumbers.length === 0) {
      return res.json({
        eventId: parseInt(eventId),
        eventName: eventInfo?.name || 'Unknown Event',
        matchType: matchType || 'VRC',
        rankings: [],
        total: 0,
        teamsInEvent: 0,
        teamsWithRankings: 0
      });
    }
    
    // Step 2: Query local database for world rankings of these teams
    let query = `
      SELECT * FROM skills_standings 
      WHERE teamNumber = ANY($1)
    `;
    let params = [teamNumbers];
    
    if (matchType) {
      query += ' AND matchType = $2';
      params.push(matchType);
    }
    
    // Sort by: 1) Combined Score 2) Auto Skills 3) Driver Skills 4) World Rank
    query += `
      ORDER BY 
        score DESC,
        highestAutonomousSkills DESC,
        highestDriverSkills DESC,
        rank ASC
    `;
    
    const result = await pool.query(query, params);
    
    // Step 3: Transform data and add event rank + grade
    const rankings = result.rows.map((team, index) => ({
      eventRank: index + 1,
      teamNumber: team.teamnumber,
      teamName: team.teamname,
      worldRank: team.rank,
      combinedScore: team.score,
      autonomousSkills: team.autonomousskills,
      driverSkills: team.driverskills,
      highestAutonomousSkills: team.highestautonomousskills,
      highestDriverSkills: team.highestdriverskills,
      organization: team.organization,
      region: team.eventregion,
      country: team.countryregion,
      matchType: team.matchtype,
      grade: teamGradeMap[team.teamnumber] || 'Unknown'
    }));
    
    // Calculate grade statistics
    const gradeStats = {
      'High School': allTeams.filter(t => t.grade === 'High School').length,
      'Middle School': allTeams.filter(t => t.grade === 'Middle School').length,
      'Elementary School': allTeams.filter(t => t.grade === 'Elementary School').length,
      'Unknown': allTeams.filter(t => !validGrades.includes(t.grade || '')).length
    };
    
    res.json({
      eventId: parseInt(eventId),
      eventName: eventInfo?.name || 'Unknown Event',
      matchType: matchType || 'VRC',
      grade: grade || 'All',
      rankings,
      total: rankings.length,
      teamsInEvent: filteredTeams.length,
      totalTeamsInEvent: allTeams.length,
      teamsWithRankings: rankings.length,
      teamsWithoutRankings: filteredTeams.length - rankings.length,
      gradeBreakdown: gradeStats
    });
    
  } catch (error) {
    console.error('Error fetching event rankings:', error);
    res.status(500).json({ error: 'Failed to fetch event rankings', details: error.message });
  }
});

// Get team events for the current season
app.get('/api/teams/:teamNumber/events', async (req, res) => {
  try {
    const { teamNumber } = req.params;
    const { season, matchType } = req.query;
    
    // Get the current season ID and API token from environment
    const seasonId = season || process.env.CURRENT_SEASON_ID || '190'; // Use query param or default to High Stakes
    const apiToken = process.env.ROBOTEVENTS_API_TOKEN;

    // Map matchType to RobotEvents program ID
    // CRITICAL: Verified from RobotEvents API on 2025-11-10
    const programMap = {
      'VRC': '1',      // VEX V5 Robotics Competition
      'VEXIQ': '41',   // VEX IQ Robotics Competition (NOT 4!)
      'VEXU': '4'      // VEX U Robotics Competition (NOT 41!)
    };

    // Get program ID from matchType, default to VRC if not provided
    const programId = matchType && programMap[matchType] ? programMap[matchType] : '1';

    console.log(`Fetching team ${teamNumber} for program: ${matchType || 'VRC'} (ID: ${programId}), season: ${seasonId}`);

    if (!apiToken) {
      throw new Error('RobotEvents API token not configured');
    }

    // First get the team ID by searching for the team with the correct program
    const teamResponse = await fetch(
      `https://www.robotevents.com/api/v2/teams?number[]=${encodeURIComponent(teamNumber.toUpperCase())}&program[]=${programId}`,
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
    const { matchType } = req.query;
    const apiToken = process.env.ROBOTEVENTS_API_TOKEN;

    // Map matchType to RobotEvents program ID
    // CRITICAL: Verified from RobotEvents API on 2025-11-10
    const programMap = {
      'VRC': '1',      // VEX V5 Robotics Competition
      'VEXIQ': '41',   // VEX IQ Robotics Competition (NOT 4!)
      'VEXU': '4'      // VEX U Robotics Competition (NOT 41!)
    };

    // Get program ID from matchType, default to VRC if not provided
    const programId = matchType && programMap[matchType] ? programMap[matchType] : '1';

    console.log(`Fetching awards for team ${teamNumber} at event ${eventId} for program: ${matchType || 'VRC'} (ID: ${programId})`);

    if (!apiToken) {
      throw new Error('RobotEvents API token not configured');
    }

    // First get the team ID by searching for the team with the correct program
    const teamResponse = await fetch(
      `https://www.robotevents.com/api/v2/teams?number[]=${encodeURIComponent(teamNumber.toUpperCase())}&program[]=${programId}`,
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

// Get seasons for a specific program (VRC, VEXIQ, VEXU)
// Query param: matchType (VRC, VEXIQ, VEXU) - defaults to VRC for backward compatibility
app.get('/api/seasons', async (req, res) => {
  try {
    const { matchType } = req.query;
    const apiToken = process.env.ROBOTEVENTS_API_TOKEN;

    if (!apiToken) {
      throw new Error('RobotEvents API token not configured');
    }

    // Map matchType to RobotEvents program ID
    // CRITICAL: Verified from RobotEvents API on 2025-11-10
    const programMap = {
      'VRC': '1',      // VEX V5 Robotics Competition
      'VEXIQ': '41',   // VEX IQ Robotics Competition (NOT 4!)
      'VEXU': '4'      // VEX U Robotics Competition (NOT 41!)
    };

    // Default to VRC if no matchType specified (backward compatibility)
    const programId = matchType && programMap[matchType] ? programMap[matchType] : '1';
    
    console.log(`Fetching seasons for program: ${matchType || 'VRC'} (ID: ${programId})`);

    const response = await fetch(
      `https://www.robotevents.com/api/v2/seasons?program[]=${programId}`,
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
    // The first season in the array will be the CURRENT season for that program
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

// API info endpoint - Must be after all other /api routes to avoid conflicts
app.get('/api', (req, res) => {
  res.json({ 
    message: 'VEX Scouting API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health - Health check',
      'GET /api/programs - Get competition programs',
      'GET /api/search - Search teams',
      'GET /api/teams/:number - Get team details',
      'POST /api/auth/login - User login',
      'POST /api/logout - User logout',
      'GET /api/admin/* - Admin endpoints (requires authentication)'
    ]
  });
});

// SQL Query Runner for skills_standings table - Admin only
// Helper function to detect dangerous SQL operations
function isDangerousQuery(query) {
  const upperQuery = query.trim().toUpperCase();
  const dangerousPatterns = [
    /DROP\s+TABLE/i,
    /DROP\s+DATABASE/i,
    /TRUNCATE\s+TABLE/i,
    /ALTER\s+TABLE/i,
    /CREATE\s+TABLE/i,
    /CREATE\s+DATABASE/i,
    /GRANT/i,
    /REVOKE/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(upperQuery));
}

// Helper function to ensure query only operates on skills_standings table
function validateSkillsStandingsQuery(query) {
  const upperQuery = query.trim().toUpperCase();
  
  // Check for SELECT queries
  if (upperQuery.startsWith('SELECT')) {
    // Must have FROM skills_standings
    if (!upperQuery.includes('FROM SKILLS_STANDINGS')) {
      return { valid: false, error: 'SELECT queries must reference skills_standings table only' };
    }
    // Check for JOINs to other tables
    const joinMatches = upperQuery.match(/JOIN\s+(\w+)/gi);
    if (joinMatches) {
      for (const join of joinMatches) {
        const tableName = join.replace(/JOIN\s+/i, '').trim();
        if (tableName.toUpperCase() !== 'SKILLS_STANDINGS') {
          return { valid: false, error: `Query joins with table ${tableName}. Only skills_standings is allowed.` };
        }
      }
    }
  }
  
  // Check for UPDATE queries
  if (upperQuery.startsWith('UPDATE')) {
    // Must be UPDATE skills_standings
    const updateMatch = upperQuery.match(/UPDATE\s+(\w+)/i);
    if (!updateMatch || updateMatch[1].toUpperCase() !== 'SKILLS_STANDINGS') {
      return { valid: false, error: 'UPDATE queries must target skills_standings table only' };
    }
  }
  
  // Check for DELETE queries
  if (upperQuery.startsWith('DELETE')) {
    // Must be DELETE FROM skills_standings
    if (!upperQuery.includes('FROM SKILLS_STANDINGS')) {
      return { valid: false, error: 'DELETE queries must target skills_standings table only' };
    }
  }
  
  // Check for INSERT queries
  if (upperQuery.startsWith('INSERT')) {
    // Must be INSERT INTO skills_standings
    if (!upperQuery.includes('INTO SKILLS_STANDINGS')) {
      return { valid: false, error: 'INSERT queries must target skills_standings table only' };
    }
  }
  
  return { valid: true };
}

// Execute SELECT queries on skills_standings (read-only, safe)
app.post('/api/admin/database/query', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { query, limit = 1000 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }
    
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return res.status(400).json({ error: 'Query cannot be empty' });
    }
    
    // Check for dangerous operations
    if (isDangerousQuery(trimmedQuery)) {
      return res.status(403).json({ 
        error: 'Dangerous query detected. This operation is not allowed for security reasons.',
        blockedOperations: ['DROP TABLE', 'TRUNCATE', 'ALTER TABLE', 'CREATE TABLE', 'GRANT', 'REVOKE']
      });
    }
    
    // Only allow SELECT queries for read operations
    const upperQuery = trimmedQuery.toUpperCase();
    if (!upperQuery.startsWith('SELECT')) {
      return res.status(400).json({ 
        error: 'Only SELECT queries are allowed. Use /api/admin/database/execute for INSERT/UPDATE/DELETE.' 
      });
    }
    
    // Validate that query only operates on skills_standings
    const validation = validateSkillsStandingsQuery(trimmedQuery);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Add LIMIT if not present (prevent large result sets)
    let finalQuery = trimmedQuery;
    if (!upperQuery.includes('LIMIT')) {
      finalQuery = `${trimmedQuery} LIMIT ${Math.min(parseInt(limit) || 1000, 5000)}`;
    }
    
    // Execute query with timeout
    const startTime = Date.now();
    const result = await pool.query(finalQuery);
    const executionTime = Date.now() - startTime;
    
    res.json({
      success: true,
      query: finalQuery,
      rows: result.rows,
      rowCount: result.rows.length,
      executionTime: `${executionTime}ms`,
      columns: result.rows.length > 0 ? Object.keys(result.rows[0]) : [],
      message: `Query executed successfully. Returned ${result.rows.length} row(s).`
    });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ 
      error: 'Error executing query', 
      details: error.message,
      hint: error.hint || null
    });
  }
});

// Execute INSERT/UPDATE/DELETE queries on skills_standings (requires confirmation)
app.post('/api/admin/database/execute', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { query, confirm } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }
    
    if (!confirm || confirm !== 'EXECUTE') {
      return res.status(400).json({ 
        error: 'Execution not confirmed. Send { confirm: "EXECUTE" } in request body.' 
      });
    }
    
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return res.status(400).json({ error: 'Query cannot be empty' });
    }
    
    // Check for dangerous operations
    if (isDangerousQuery(trimmedQuery)) {
      return res.status(403).json({ 
        error: 'Dangerous query detected. This operation is not allowed for security reasons.',
        blockedOperations: ['DROP TABLE', 'TRUNCATE', 'ALTER TABLE', 'CREATE TABLE', 'GRANT', 'REVOKE']
      });
    }
    
    // Only allow INSERT, UPDATE, DELETE
    const upperQuery = trimmedQuery.toUpperCase();
    const allowedOperations = ['INSERT', 'UPDATE', 'DELETE'];
    const operation = allowedOperations.find(op => upperQuery.startsWith(op));
    
    if (!operation) {
      return res.status(400).json({ 
        error: `Only ${allowedOperations.join(', ')} operations are allowed. Use /api/admin/database/query for SELECT.` 
      });
    }
    
    // Validate that query only operates on skills_standings
    const validation = validateSkillsStandingsQuery(trimmedQuery);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Execute query in transaction
    await pool.query('BEGIN');
    
    try {
      const startTime = Date.now();
      const result = await pool.query(trimmedQuery);
      const executionTime = Date.now() - startTime;
      
      await pool.query('COMMIT');
      
      res.json({
        success: true,
        query: trimmedQuery,
        operation,
        rowCount: result.rowCount || 0,
        executionTime: `${executionTime}ms`,
        message: `${operation} query executed successfully. ${result.rowCount || 0} row(s) affected.`
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ 
      error: 'Error executing query', 
      details: error.message,
      hint: error.hint || null
    });
  }
});

// Get skills_standings table schema
app.get('/api/admin/database/schema', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const schemaQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'skills_standings'
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(schemaQuery);
    
    res.json({
      tableName: 'skills_standings',
      columns: result.rows
    });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({ error: 'Error fetching table schema', details: error.message });
  }
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