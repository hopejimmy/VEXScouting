# Scale VEXScouting to 1000 Concurrent Users — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the VEXScouting backend to comfortably handle 1000 concurrent users by fixing the DB connection ceiling, adding a Redis caching layer, isolating the analysis worker process, and adding rate limiting and async logging.

**Architecture:** Three independent phases — Phase 1 (quick wins, no new infra), Phase 2 (Redis caching layer), Phase 3 (process isolation + clustering). Each phase is independently deployable and shippable.

**Tech Stack:** Node.js 18 (ESM), Express 4, PostgreSQL 15, ioredis 5, express-rate-limit 7, pino 8, child_process.fork, PM2

---

## Dependency Map & Risk Register

| Dependency | Version | Why Needed | Risk | Mitigation |
|---|---|---|---|---|
| `ioredis` | ^5.3.2 | Redis client for caching | Redis infra must be provisioned (Railway Add-on or Redis Cloud). If Redis goes down, cache misses must fall back gracefully, not crash. | Always wrap Redis ops in try/catch; treat cache as optional. |
| `express-rate-limit` | ^7.4.1 | Prevent request flooding | Too-low limits block legitimate users during competition day spikes (burst traffic). | Use `skip` option for authenticated admins; tune windowMs/max conservatively. |
| `pino` | ^8.21.0 | Async structured logging | Breaks any code that parses `console.log` output format. | Search codebase before replacing — only `server.js` uses it. |
| `pino-pretty` | ^11.0.0 (dev) | Human-readable logs in dev | Dev-only. No prod risk. | `--save-dev` only. |
| `pm2` | ^5.3.1 (dev) | Multi-core clustering | PM2 requires `ecosystem.config.cjs` in ESM projects (`.cjs` extension, not `.js`). SSE connections break if Railway load-balances across replicas without sticky sessions. | Use Node.js built-in `cluster` module for single-host multi-core. SSE stream is admin-only so sticky sessions matter less. |
| Redis infrastructure | — | Cache backing store | Railway Redis add-on costs money. Redis Cloud free tier is 30MB (sufficient for this app). Cold start: first request after deploy hits DB/RobotEvents until cache warms. | Document that cache warm-up takes ~5 minutes after cold deploy. |
| PostgreSQL pool size | — | Increase from 20 → 75 | Railway Postgres hobby plan limits to 25 connections total. Exceeding that causes `sorry, too many clients`. | Check Railway plan before increasing. Set max to 20 for hobby, 75 for pro. Use `POOL_MAX` env var. |
| `child_process.fork` | built-in | Analysis worker isolation | Worker needs to re-import `analysis.js` and its own DB pool. IPC serialization adds latency for large log messages. | Worker creates its own `pg.Pool` with `max: 5`. Messages are small log strings. |

---

## File Map

### New Files
| File | Purpose |
|---|---|
| `src/api/middleware/rateLimiter.js` | express-rate-limit config for public and auth'd routes |
| `src/api/middleware/cache.js` | ioredis client singleton + `getOrSet` helper |
| `src/api/services/analysis-process.js` | Standalone child process entry point for analysis worker |

### Modified Files
| File | What Changes |
|---|---|
| `src/api/server.js` | Pool max config, replace console.log with pino, wire rate limiter, wire cache on search/team/robotevents endpoints |
| `src/api/services/analysis-worker.js` | Add `fork()` launcher alongside existing EventEmitter (backward-compat wrapper) |
| `package.json` | Add ioredis, express-rate-limit, pino, pino-pretty (dev), pm2 (dev) |
| `.env` / `env.template` | Add `REDIS_URL`, `POOL_MAX`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` |
| `ecosystem.config.cjs` | PM2 cluster config (new file) |

---

## Phase 1: Quick Wins (No New Infrastructure)

### Task 1: Tune DB Connection Pool

**Files:**
- Modify: `src/api/server.js:141-192`
- Modify: `.env`
- Modify: `env.template`

**Why:** Dev pool has no `max` (defaults to 10). Production hard-coded to `20`. Under 1000 concurrent users this is the first bottleneck. Pool size should be configurable per environment.

- [ ] **Step 1: Add `POOL_MAX` to `.env` and `env.template`**

In `.env`, add:
```
POOL_MAX=75
```

In `env.template`, add:
```
# PostgreSQL connection pool size
# Railway hobby plan: 25 max, Railway pro: 75-100, local dev: 10
POOL_MAX=20
```

- [ ] **Step 2: Update pool config in `server.js` to read `POOL_MAX` and fix dev pool**

Find this block in `server.js` (around line 152):
```js
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isPrivateNetwork ? false : {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 20
    });
```

Replace the entire `try { if (process.env.DATABASE_URL) ... }` block (lines 142-192) with:

```js
const POOL_MAX = parseInt(process.env.POOL_MAX || '20', 10);

const basePoolConfig = {
  max: POOL_MAX,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 30000,
};

try {
  if (process.env.DATABASE_URL) {
    const isPrivateNetwork = process.env.DATABASE_URL.includes('railway.internal');
    pool = new Pool({
      ...basePoolConfig,
      connectionString: process.env.DATABASE_URL,
      ssl: isPrivateNetwork ? false : { rejectUnauthorized: false },
    });
  } else {
    pool = new Pool({
      ...basePoolConfig,
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'vexscouting',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      ssl: false,
    });
  }
} catch (error) {
  console.error('❌ Failed to create database pool:', error);
}
```

- [ ] **Step 3: Verify pool config loads at startup**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
POOL_MAX=5 node -e "
import('./src/api/server.js').then(() => {
  setTimeout(() => process.exit(0), 2000);
});
" 2>&1 | head -20
```

Expected: No crash. Startup logs show DB connection successful.

- [ ] **Step 4: Commit**

```bash
git add src/api/server.js .env env.template
git commit -m "feat: make DB pool size configurable via POOL_MAX env var"
```

---

### Task 2: Add PostgreSQL Indexes for Hot Query Paths

**Files:**
- Modify: `src/api/server.js` — `initializeDatabase()` function (around line 233)

**Why:** The search endpoint runs `ILIKE '%query%'` on `teamNumber` and `teamName`. Without indexes, this is a full table scan on every keystroke. With 1000 users doing real-time search, this saturates I/O.

- [ ] **Step 1: Add index creation to `initializeDatabase()` in `server.js`**

Find the end of `initializeDatabase()` just before the closing `console.log('✅ Database schema initialized')` (search for that string). Insert before it:

```js
    // Performance indexes for high-traffic endpoints
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_skills_teamNumber_lower
        ON skills_standings (LOWER(teamNumber))
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_skills_teamName_lower
        ON skills_standings (LOWER(teamName))
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_skills_matchType
        ON skills_standings (matchType)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_skills_rank
        ON skills_standings (rank)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_event_stats_team
        ON team_event_stats (team_number)
    `);
```

- [ ] **Step 2: Update the search query in `GET /api/search` to use the index**

Find the search handler (around line 1220). The query likely uses `ILIKE`. Update it to use `LOWER()` to match the functional index:

Find the existing query (it will look like):
```js
WHERE teamNumber ILIKE $1 OR teamName ILIKE $1
```

Replace with:
```js
WHERE LOWER(teamNumber) LIKE LOWER($1) OR LOWER(teamName) LIKE LOWER($1)
```

(ILIKE does not use functional indexes; `LOWER(col) LIKE LOWER($1)` does.)

- [ ] **Step 3: Verify indexes were created**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
node -e "
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ host: 'localhost', database: 'vexscouting', user: 'postgres', password: 'postgres' });
pool.query(\"SELECT indexname FROM pg_indexes WHERE tablename = 'skills_standings'\").then(r => {
  console.log(r.rows);
  process.exit(0);
});
"
```

Expected output includes `idx_skills_teamNumber_lower`, `idx_skills_teamName_lower`, etc.

- [ ] **Step 4: Commit**

```bash
git add src/api/server.js
git commit -m "perf: add functional indexes on skills_standings for search and matchType queries"
```

---

### Task 3: Replace Synchronous `console.log` with Pino Async Logger

**Files:**
- Create: `src/api/logger.js`
- Modify: `src/api/server.js` — all `console.log` / `console.error` / `console.warn` calls

**Why:** Node.js `console.log` flushes synchronously to stdout on every call. At high throughput (1000 users) this blocks the event loop measurably. Pino writes to a buffered stream asynchronously and is ~5x faster.

- [ ] **Step 1: Install pino**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
npm install pino@^8.21.0
npm install --save-dev pino-pretty@^11.0.0
```

Expected: `package.json` updated, no errors.

- [ ] **Step 2: Create `src/api/logger.js`**

```js
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino(
  isDev
    ? { transport: { target: 'pino-pretty', options: { colorize: true } }, level: 'debug' }
    : { level: 'info' }
);

export default logger;
```

- [ ] **Step 3: Replace the per-request logger middleware in `server.js`**

Find (around line 97):
```js
app.use((req, res, next) => {
  console.log(`📥 [${req.method}] ${req.url}`);
  if (req.method !== 'GET' && req.body) {
    try {
      const bodyStr = JSON.stringify(req.body);
      console.log('   Body:', bodyStr.substring(0, 200) + (bodyStr.length > 200 ? '...' : ''));
    } catch (e) {
      console.log('   Body: [Could not stringify]');
    }
  }
  next();
});
```

Replace with:
```js
import logger from './logger.js';

// ... (add import at top of file with other imports)

app.use((req, res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'incoming request');
  next();
});
```

Add `import logger from './logger.js';` to the top of `server.js` with the other imports.

- [ ] **Step 4: Replace `console.log/error/warn` in `server.js` startup section**

Replace the startup `console.log` block (lines 25-33):
```js
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  ...
});
```
With:
```js
// Move this after logger import
logger.info({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CURRENT_SEASON_ID: process.env.CURRENT_SEASON_ID,
  hasApiToken: !!process.env.ROBOTEVENTS_API_TOKEN,
  hasJwtSecret: !!process.env.JWT_SECRET,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasPostgresHost: !!process.env.POSTGRES_HOST,
}, 'Environment variables loaded');
```

Replace all remaining `console.log(` → `logger.info(` and `console.error(` → `logger.error(` and `console.warn(` → `logger.warn(` throughout `server.js`.

```bash
# Verify no console.log remain (should return 0 after replacement)
grep -c "console\.log\|console\.error\|console\.warn" /Users/jimmyzmhe/Desktop/git/VEXScouting/src/api/server.js
```

- [ ] **Step 5: Start server and confirm logs appear**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
NODE_ENV=development node src/api/server.js 2>&1 | head -10
```

Expected: Colourised pino output in dev, JSON in production.

- [ ] **Step 6: Commit**

```bash
git add src/api/logger.js src/api/server.js package.json package-lock.json
git commit -m "perf: replace synchronous console.log with pino async logger"
```

---

### Task 4: Add Rate Limiting Middleware

**Files:**
- Create: `src/api/middleware/rateLimiter.js`
- Modify: `src/api/server.js` — wire middleware before route handlers

**Why:** No protection against request floods. A single client can saturate the server unchecked. During competition events, bot scrapers could DoS the server while real users are trying to use it.

- [ ] **Step 1: Install express-rate-limit**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
npm install express-rate-limit@^7.4.1
```

- [ ] **Step 2: Add rate limit config to `.env` and `env.template`**

In `.env`:
```
# Rate limiting: 200 requests per 1 minute per IP for public routes
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
# Admin routes get their own limit
ADMIN_RATE_LIMIT_MAX=60
```

In `env.template`:
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
ADMIN_RATE_LIMIT_MAX=60
```

- [ ] **Step 3: Create `src/api/middleware/rateLimiter.js`**

```js
import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX || '200', 10);
const adminMax = parseInt(process.env.ADMIN_RATE_LIMIT_MAX || '60', 10);

// Public API limiter: 200 req/min per IP
export const publicLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/api/health', // health checks never rate-limited
});

// Auth endpoint limiter: 20 req/min per IP (brute-force protection)
export const authLimiter = rateLimit({
  windowMs,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please wait before trying again.' },
});

// Admin panel limiter: 60 req/min per IP
export const adminLimiter = rateLimit({
  windowMs,
  max: adminMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Admin rate limit exceeded.' },
});
```

- [ ] **Step 4: Wire rate limiters in `server.js`**

Add import after other imports at the top of `server.js`:
```js
import { publicLimiter, authLimiter, adminLimiter } from './middleware/rateLimiter.js';
```

After `app.use(express.json());` (around line 95), add:
```js
// Apply public rate limiter to all /api routes
app.use('/api', publicLimiter);

// Apply stricter limiter on auth endpoints
app.use('/api/auth', authLimiter);

// Apply admin limiter on admin endpoints
app.use('/api/admin', adminLimiter);
```

- [ ] **Step 5: Verify rate limiter returns 429 after threshold**

```bash
# Send 25 rapid auth requests — should get 429 on the 21st
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
node -e "
import fetch from 'node-fetch';
let count = 0;
const run = async () => {
  for (let i = 0; i < 25; i++) {
    const r = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'x', password: 'y' })
    });
    count++;
    if (r.status === 429) {
      console.log('Got 429 on request #' + count + ' ✅');
      process.exit(0);
    }
  }
  console.log('No 429 received after 25 requests ❌');
};
run();
"
```

Expected: `Got 429 on request #21 ✅`

- [ ] **Step 6: Commit**

```bash
git add src/api/middleware/rateLimiter.js src/api/server.js package.json package-lock.json .env env.template
git commit -m "feat: add express-rate-limit for public, auth, and admin routes"
```

---

## Phase 2: Redis Caching Layer (Requires Redis Infrastructure)

> **Pre-requisite:** Provision Redis before starting Phase 2.
> - **Railway:** Dashboard → Add Plugin → Redis → copy `REDIS_URL` to env
> - **Local dev:** `brew install redis && brew services start redis` → `REDIS_URL=redis://localhost:6379`
> - **Redis Cloud (free):** cloud.redis.com → free 30MB instance → copy connection string

---

### Task 5: Redis Client Singleton + Cache Helper

**Files:**
- Create: `src/api/middleware/cache.js`
- Modify: `.env`, `env.template`

**Why:** All caching in Phase 2 funnels through one ioredis client. A singleton prevents connection exhaustion. The `getOrSet` helper enforces the cache-aside pattern and handles Redis failures gracefully (falls through to DB/API).

- [ ] **Step 1: Install ioredis**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
npm install ioredis@^5.3.2
```

- [ ] **Step 2: Add `REDIS_URL` to `.env` and `env.template`**

In `.env`:
```
REDIS_URL=redis://localhost:6379
```

In `env.template`:
```
# Redis connection (Railway add-on or Redis Cloud)
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 3: Create `src/api/middleware/cache.js`**

```js
import Redis from 'ioredis';
import logger from '../logger.js';

let redis = null;

function getRedisClient() {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('REDIS_URL not set — caching disabled');
    return null;
  }

  redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 3000,
  });

  redis.on('error', (err) => {
    logger.warn({ err: err.message }, 'Redis connection error — cache unavailable');
  });

  return redis;
}

/**
 * Cache-aside helper.
 * - Tries Redis first; on miss, calls `fetchFn`; stores result with TTL.
 * - If Redis is unavailable at any point, silently falls through to `fetchFn`.
 *
 * @param {string} key  Cache key
 * @param {number} ttl  TTL in seconds
 * @param {() => Promise<any>} fetchFn  Function that returns the fresh value
 */
export async function getOrSet(key, ttl, fetchFn) {
  const client = getRedisClient();

  if (client) {
    try {
      const cached = await client.get(key);
      if (cached !== null) {
        logger.debug({ key }, 'cache hit');
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn({ key, err: err.message }, 'Redis GET failed — fetching fresh');
    }
  }

  const value = await fetchFn();

  if (client && value !== undefined && value !== null) {
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      logger.warn({ key, err: err.message }, 'Redis SET failed — proceeding without cache');
    }
  }

  return value;
}

/**
 * Invalidate a single cache key or a key pattern (prefix*).
 */
export async function invalidate(keyOrPattern) {
  const client = getRedisClient();
  if (!client) return;

  try {
    if (keyOrPattern.includes('*')) {
      const keys = await client.keys(keyOrPattern);
      if (keys.length > 0) await client.del(...keys);
    } else {
      await client.del(keyOrPattern);
    }
  } catch (err) {
    logger.warn({ keyOrPattern, err: err.message }, 'Redis DEL failed');
  }
}
```

- [ ] **Step 4: Verify cache helper works end-to-end**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
REDIS_URL=redis://localhost:6379 node --input-type=module << 'EOF'
import { getOrSet } from './src/api/middleware/cache.js';

let callCount = 0;
const result1 = await getOrSet('test:ping', 10, async () => {
  callCount++;
  return { hello: 'world', ts: Date.now() };
});

const result2 = await getOrSet('test:ping', 10, async () => {
  callCount++;
  return { hello: 'world', ts: Date.now() };
});

console.assert(callCount === 1, `fetchFn called ${callCount} times — expected 1`);
console.assert(result1.hello === result2.hello, 'cached value mismatch');
console.log('✅ Cache helper works. fetchFn called once, second call served from cache.');
process.exit(0);
EOF
```

Expected: `✅ Cache helper works. fetchFn called once, second call served from cache.`

- [ ] **Step 5: Verify graceful degradation when Redis is down**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
REDIS_URL=redis://localhost:9999 node --input-type=module << 'EOF'
import { getOrSet } from './src/api/middleware/cache.js';

let callCount = 0;
const result = await getOrSet('test:fallback', 10, async () => {
  callCount++;
  return { fallback: true };
});

console.assert(callCount === 1, 'fetchFn not called');
console.assert(result.fallback === true, 'wrong value returned');
console.log('✅ Graceful fallback works when Redis is unreachable.');
process.exit(0);
EOF
```

Expected: `✅ Graceful fallback works when Redis is unreachable.`

- [ ] **Step 6: Commit**

```bash
git add src/api/middleware/cache.js package.json package-lock.json .env env.template
git commit -m "feat: add ioredis cache helper with graceful fallback"
```

---

### Task 6: Cache Search Results

**Files:**
- Modify: `src/api/server.js` — `GET /api/search` handler (around line 1220)

**Why:** Search is the highest-frequency endpoint. Every keystroke fires a debounced request. The same query (`q=254`, `q=VRC`) will be repeated by hundreds of users simultaneously during a competition. A 60-second TTL eliminates most of the DB load.

- [ ] **Step 1: Add `getOrSet` import to `server.js`**

At the top of `server.js` with other imports, add:
```js
import { getOrSet } from './middleware/cache.js';
```

- [ ] **Step 2: Wrap the search query in `getOrSet`**

Find `app.get('/api/search'` (around line 1220). The handler will have a `pool.query(...)` call. Wrap it:

Before (approximate current code):
```js
app.get('/api/search', async (req, res) => {
  const { q, matchType, limit = 20, offset = 0 } = req.query;
  // ...
  const result = await pool.query(
    `SELECT ... FROM skills_standings WHERE ... LIMIT $3 OFFSET $4`,
    [searchTerm, matchType, limitNum, offsetNum]
  );
  res.json(result.rows);
});
```

After:
```js
app.get('/api/search', async (req, res) => {
  try {
    const { q = '', matchType = '', limit = 20, offset = 0 } = req.query;
    const cacheKey = `search:${q.toLowerCase().trim()}:${matchType}:${limit}:${offset}`;

    const rows = await getOrSet(cacheKey, 60, async () => {
      const searchTerm = `%${q.toLowerCase().trim()}%`;
      const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
      const offsetNum = parseInt(offset, 10) || 0;

      let queryText, queryParams;
      if (matchType) {
        queryText = `SELECT * FROM skills_standings WHERE (LOWER(teamNumber) LIKE LOWER($1) OR LOWER(teamName) LIKE LOWER($1)) AND matchType = $2 ORDER BY rank ASC LIMIT $3 OFFSET $4`;
        queryParams = [searchTerm, matchType, limitNum, offsetNum];
      } else {
        queryText = `SELECT * FROM skills_standings WHERE LOWER(teamNumber) LIKE LOWER($1) OR LOWER(teamName) LIKE LOWER($1) ORDER BY rank ASC LIMIT $3 OFFSET $4`;
        queryParams = [searchTerm, limitNum, offsetNum];
      }

      const result = await pool.query(queryText, queryParams);
      return result.rows;
    });

    res.json(rows);
  } catch (err) {
    logger.error({ err: err.message }, 'Search error');
    res.status(500).json({ error: 'Search failed' });
  }
});
```

> **Important:** Read the actual current search handler before replacing — align the query logic exactly. The above is a template; the parameter positions may differ in the real code.

- [ ] **Step 3: Verify search returns cached results**

Start the server and run:
```bash
# First request — should hit DB
curl -s "http://localhost:3000/api/search?q=254&matchType=VRC" | jq length

# Second identical request — should hit cache (check pino logs for "cache hit")
curl -s "http://localhost:3000/api/search?q=254&matchType=VRC" | jq length
```

Check server logs — second request should log `cache hit`.

- [ ] **Step 4: Commit**

```bash
git add src/api/server.js
git commit -m "perf: cache search results in Redis with 60s TTL"
```

---

### Task 7: Cache Team Data and `GET /api/teams` Listing

**Files:**
- Modify: `src/api/server.js` — `GET /api/teams` (line 1093) and `GET /api/teams/:teamNumber` (line 1150)

**Why:** Team listings and individual team pages are read-heavy. Skills data changes only when a CSV is uploaded. A 10-minute TTL is safe; the upload endpoint should invalidate the cache.

- [ ] **Step 1: Add `invalidate` import to `server.js`**

Update the existing import line:
```js
import { getOrSet, invalidate } from './middleware/cache.js';
```

- [ ] **Step 2: Wrap `GET /api/teams` in cache**

Find `app.get('/api/teams'` (line 1093). Wrap the DB query:

```js
app.get('/api/teams', async (req, res) => {
  try {
    const { matchType, limit = 50, offset = 0 } = req.query;
    const cacheKey = `teams:list:${matchType || 'all'}:${limit}:${offset}`;

    const rows = await getOrSet(cacheKey, 600, async () => {
      const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
      const offsetNum = parseInt(offset, 10) || 0;
      let result;
      if (matchType) {
        result = await pool.query(
          `SELECT * FROM skills_standings WHERE matchType = $1 ORDER BY rank ASC LIMIT $2 OFFSET $3`,
          [matchType, limitNum, offsetNum]
        );
      } else {
        result = await pool.query(
          `SELECT * FROM skills_standings ORDER BY rank ASC LIMIT $1 OFFSET $2`,
          [limitNum, offsetNum]
        );
      }
      return result.rows;
    });

    res.json(rows);
  } catch (err) {
    logger.error({ err: err.message }, 'Teams list error');
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});
```

> **Important:** Read the actual handler at line 1093 first and preserve any additional query parameters or response shaping.

- [ ] **Step 3: Wrap `GET /api/teams/:teamNumber` in cache**

Find `app.get('/api/teams/:teamNumber'` (line 1150). Wrap similarly:

```js
app.get('/api/teams/:teamNumber', async (req, res) => {
  try {
    const { teamNumber } = req.params;
    const { matchType } = req.query;
    const cacheKey = `team:${teamNumber}:${matchType || 'all'}`;

    const data = await getOrSet(cacheKey, 600, async () => {
      let result;
      if (matchType) {
        result = await pool.query(
          `SELECT * FROM skills_standings WHERE LOWER(teamNumber) = LOWER($1) AND matchType = $2`,
          [teamNumber, matchType]
        );
      } else {
        result = await pool.query(
          `SELECT * FROM skills_standings WHERE LOWER(teamNumber) = LOWER($1) ORDER BY rank ASC`,
          [teamNumber]
        );
      }
      return result.rows;
    });

    if (!data || data.length === 0) return res.status(404).json({ error: 'Team not found' });
    res.json(data);
  } catch (err) {
    logger.error({ err: err.message }, 'Team fetch error');
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});
```

- [ ] **Step 4: Invalidate team cache on CSV upload**

Find `app.post('/api/upload'` (line 1000). At the end of the successful upload handler (after the bulk insert), add:

```js
// Invalidate team caches after upload
await invalidate('teams:list:*');
await invalidate('search:*');
logger.info('Cache invalidated after CSV upload');
```

- [ ] **Step 5: Verify cache invalidation on upload**

```bash
# Fetch a team (warms cache)
curl -s "http://localhost:3000/api/teams/254" | jq .

# Upload a CSV (should invalidate)
# (use the frontend upload page or curl with a CSV)

# Fetch again — should not return stale data
curl -s "http://localhost:3000/api/teams/254" | jq .
```

- [ ] **Step 6: Commit**

```bash
git add src/api/server.js
git commit -m "perf: cache team list and team detail responses with 10min TTL, invalidate on upload"
```

---

### Task 8: Cache RobotEvents API Responses

**Files:**
- Modify: `src/api/server.js` — `GET /api/teams/:teamNumber/events` (line 1426), `GET /api/events/:eventId/rankings` (line 1266), `GET /api/teams/:teamNumber/events/:eventId/awards` (line 1681)

**Why:** These endpoints call the live RobotEvents API on every request. At 1000 users, this triggers hundreds of identical outbound HTTP calls for popular teams/events. The RobotEvents API rate limit is the single most dangerous external constraint. Event data is relatively static (updates every few hours).

**TTL strategy:**
- Team events list: 15 minutes (changes once per event day)
- Event rankings: 5 minutes (changes during active matches)
- Awards: 60 minutes (almost never changes)

- [ ] **Step 1: Wrap `GET /api/teams/:teamNumber/events` RobotEvents call**

Find the handler at line 1426. The handler calls RobotEvents via `fetch()`. Wrap the entire fetch logic:

```js
app.get('/api/teams/:teamNumber/events', async (req, res) => {
  try {
    const { teamNumber } = req.params;
    const { season, program } = req.query;
    const cacheKey = `re:team-events:${teamNumber}:${season || 'all'}:${program || 'all'}`;

    const data = await getOrSet(cacheKey, 900, async () => {
      // EXISTING fetch() logic goes here — move it inside this callback unchanged
      // Return whatever the handler currently sends to res.json(...)
    });

    res.json(data);
  } catch (err) {
    logger.error({ err: err.message }, 'Team events fetch error');
    res.status(500).json({ error: 'Failed to fetch team events' });
  }
});
```

> **Pattern:** For each of the three handlers, extract the existing `fetch()` call body into the `getOrSet` callback. Return the value instead of calling `res.json()` inside the callback. Call `res.json(data)` outside after `getOrSet` resolves.

- [ ] **Step 2: Wrap `GET /api/events/:eventId/rankings`**

Same pattern, TTL = 300 (5 minutes):
```js
const cacheKey = `re:event-rankings:${eventId}:${gradeLevel || 'all'}`;
const data = await getOrSet(cacheKey, 300, async () => { /* existing fetch logic */ });
res.json(data);
```

- [ ] **Step 3: Wrap `GET /api/teams/:teamNumber/events/:eventId/awards`**

Same pattern, TTL = 3600 (60 minutes):
```js
const cacheKey = `re:awards:${teamNumber}:${eventId}`;
const data = await getOrSet(cacheKey, 3600, async () => { /* existing fetch logic */ });
res.json(data);
```

- [ ] **Step 4: Verify RobotEvents responses are cached**

```bash
# First call — hits RobotEvents (check server logs for outbound fetch)
curl -s "http://localhost:3000/api/teams/254/events?season=197" | jq '.[] | .name' | head -5

# Second identical call — should log "cache hit", no outbound fetch
curl -s "http://localhost:3000/api/teams/254/events?season=197" | jq '.[] | .name' | head -5
```

Second call should complete in <5ms and server logs should show `cache hit`.

- [ ] **Step 5: Commit**

```bash
git add src/api/server.js
git commit -m "perf: cache RobotEvents API responses in Redis (5-60min TTL by endpoint type)"
```

---

## Phase 3: Process Architecture

### Task 9: Isolate Analysis Worker as a Child Process

**Files:**
- Create: `src/api/services/analysis-process.js`
- Modify: `src/api/services/analysis-worker.js`
- Modify: `src/api/server.js` — SSE stream and worker start/stop handlers

**Why:** The analysis worker runs matrix calculations (OPR/DPR/CCWM) in tight loops with 2-second cooldowns between API fetches. It runs inside the main Express event loop, competing for CPU with real user requests. Under load, analysis drags response times for all users. Forking it as a child process gives it a separate V8 instance and its own CPU budget.

**Risk:** The child process needs its own `pg.Pool`. It communicates with the parent via IPC messages (JSON). The SSE stream in the admin panel must be re-wired to receive messages from the child rather than from the EventEmitter.

- [ ] **Step 1: Create `src/api/services/analysis-process.js` (standalone child entry point)**

```js
// This file is executed by child_process.fork()
// It has its own process, its own pg.Pool, and communicates via process.send()

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureTeamAnalysis } from './analysis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../..', '.env') });

const { Pool } = pg;
const POOL_MAX = parseInt(process.env.POOL_MAX || '5', 10);

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway.internal') ? false : { rejectUnauthorized: false },
    max: POOL_MAX,
  });
} else {
  pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || 'vexscouting',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: false,
    max: POOL_MAX,
  });
}

function send(type, message, extra = {}) {
  process.send({ type, message, ...extra });
}

async function run({ apiToken, seasonId, force }) {
  send('log', `🚀 Starting Analysis Worker... (Force: ${force})`, { level: 'info' });

  let teams;
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT team_number FROM tracked_teams ORDER BY created_at DESC');
    client.release();
    teams = res.rows.map(r => r.team_number);
  } catch (err) {
    send('log', `❌ Failed to fetch tracked teams: ${err.message}`, { level: 'error' });
    process.send({ type: 'done' });
    return;
  }

  if (teams.length === 0) {
    send('log', 'ℹ️ No tracked teams found.', { level: 'warn' });
    process.send({ type: 'done' });
    return;
  }

  send('log', `📋 Found ${teams.length} teams to process.`, { level: 'info' });
  process.send({ type: 'progress', current: 0, total: teams.length });

  for (let i = 0; i < teams.length; i++) {
    const teamNumber = teams[i];
    process.send({ type: 'progress', current: i + 1, total: teams.length, currentTeam: teamNumber });
    send('log', `[${i + 1}/${teams.length}] Analyzing Team ${teamNumber}...`, { level: 'process' });

    try {
      await ensureTeamAnalysis(pool, teamNumber, apiToken, seasonId, (msg) => {
        send('log', `  > ${msg}`, { level: 'debug' });
      }, force);
      send('log', `✅ Team ${teamNumber} processed.`, { level: 'success' });
    } catch (err) {
      send('log', `❌ Failed ${teamNumber}: ${err.message}`, { level: 'error' });
      if (err.message.includes('429')) {
        send('log', '⚠️ Rate Limited! Pausing 60s...', { level: 'warn' });
        await new Promise(r => setTimeout(r, 60000));
      }
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  send('log', '🎉 Analysis Complete!', { level: 'complete' });
  process.send({ type: 'done' });
  await pool.end();
}

// Receive start command from parent
process.on('message', (msg) => {
  if (msg.cmd === 'start') {
    run(msg).catch(err => {
      send('log', `🔥 Fatal: ${err.message}`, { level: 'error' });
      process.send({ type: 'done' });
    });
  }
  if (msg.cmd === 'stop') {
    send('log', '⏹️ Stop requested — finishing current team.', { level: 'info' });
    // Graceful stop: set a flag the loop can check
    process._stopRequested = true;
  }
});
```

- [ ] **Step 2: Update `analysis-worker.js` to use `child_process.fork`**

Replace the contents of `src/api/services/analysis-worker.js` with:

```js
import { fork } from 'child_process';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dirname, 'analysis-process.js');

class AnalysisWorker extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.currentTeam = null;
    this.progress = { current: 0, total: 0 };
    this._child = null;
  }

  async start(pool, apiToken, seasonId, force = false) {
    if (this.isRunning) return false;

    this.isRunning = true;
    this.emit('log', { type: 'info', message: '🚀 Forking analysis worker process...' });

    this._child = fork(WORKER_PATH, [], {
      execArgv: ['--input-type=module'],
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    this._child.on('message', (msg) => {
      if (msg.type === 'log') {
        this.emit('log', { type: msg.level || 'info', message: msg.message });
      }
      if (msg.type === 'progress') {
        this.progress = { current: msg.current, total: msg.total };
        this.currentTeam = msg.currentTeam || this.currentTeam;
      }
      if (msg.type === 'done') {
        this.isRunning = false;
        this._child = null;
        this.emit('log', { type: 'stop', message: '⏹️ Analysis Stopped.' });
        this.emit('status', { running: false });
      }
    });

    this._child.on('exit', (code) => {
      if (this.isRunning) {
        this.emit('log', { type: 'error', message: `Worker exited unexpectedly (code ${code})` });
        this.isRunning = false;
        this._child = null;
      }
    });

    this._child.send({ cmd: 'start', apiToken, seasonId, force });
    return true;
  }

  requestStop() {
    if (this._child) {
      this._child.send({ cmd: 'stop' });
      this.emit('log', { type: 'info', message: '⏳ Stopping request sent to worker...' });
    }
  }

  stop() {
    if (this._child) {
      this._child.kill('SIGTERM');
      this._child = null;
    }
    this.isRunning = false;
    this.emit('log', { type: 'stop', message: '⏹️ Analysis Stopped.' });
    this.emit('status', { running: false });
  }
}

export const analysisWorker = new AnalysisWorker();
```

- [ ] **Step 3: Start server and trigger analysis from admin panel**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
node src/api/server.js &

# Start analysis via API
curl -s -X POST http://localhost:3000/api/admin/analysis/start \
  -H "Authorization: Bearer <your-jwt-token>" | jq .
```

Check server logs for `Forking analysis worker process...` followed by log messages from the child.

- [ ] **Step 4: Verify main process stays responsive while worker runs**

While analysis is running:
```bash
# This should respond in <50ms even while worker is crunching
time curl -s "http://localhost:3000/api/search?q=254" > /dev/null
```

Expected: Response time <50ms.

- [ ] **Step 5: Commit**

```bash
git add src/api/services/analysis-process.js src/api/services/analysis-worker.js
git commit -m "perf: isolate analysis worker as child_process.fork — frees main event loop"
```

---

### Task 10: PM2 Cluster Config for Multi-Core Usage

**Files:**
- Create: `ecosystem.config.cjs`
- Modify: `package.json` — add `start:cluster` script

**Why:** Node.js runs on a single core by default. A server with 2 cores has 50% idle CPU. PM2 cluster mode forks the Express server across all available cores, each with its own event loop. Incoming requests are distributed round-robin. This multiplies throughput by core count.

**Constraint:** The SSE stream (`/api/admin/analysis/stream`) uses in-process EventEmitter. With multiple processes, only the process that owns the `analysisWorker` singleton receives events. Two mitigations: (a) publish worker logs to Redis pub/sub so all processes can relay them, or (b) run analysis SSE only on one designated worker (worker 0). Option (b) is simpler and recommended here.

- [ ] **Step 1: Install PM2**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
npm install --save-dev pm2@^5.3.1
```

- [ ] **Step 2: Create `ecosystem.config.cjs`**

```js
// NOTE: .cjs extension required — ecosystem file uses CommonJS; ESM projects cannot use .js
module.exports = {
  apps: [
    {
      name: 'vexscouting-api',
      script: './src/api/server.js',
      instances: 'max',         // Uses all available CPU cores
      exec_mode: 'cluster',
      node_args: '--experimental-vm-modules',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart on uncaught exceptions rather than crashing
      max_memory_restart: '512M',
      // Graceful shutdown: wait for in-flight requests
      kill_timeout: 5000,
      // Limit log file size
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
```

- [ ] **Step 3: Add `start:cluster` script to `package.json`**

In `package.json`, update `scripts`:
```json
"scripts": {
  "dev": "node src/api/server.js",
  "start": "node src/db/migrate.js && NODE_ENV=production node src/api/server.js",
  "start:cluster": "node src/db/migrate.js && NODE_ENV=production npx pm2 start ecosystem.config.cjs --env production",
  "stop:cluster": "npx pm2 stop vexscouting-api",
  "logs:cluster": "npx pm2 logs vexscouting-api",
  "migrate": "node src/db/migrate.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

- [ ] **Step 4: Document SSE limitation in a comment in `server.js`**

Find `app.get('/api/admin/analysis/stream'` (line 536). Add a comment above it:

```js
// NOTE: In PM2 cluster mode, this SSE stream only works correctly if the client
// is routed to the same worker process that owns the analysisWorker singleton.
// In single-process deployments (Railway default), this works fine.
// For multi-process cluster: configure a Redis pub/sub relay (future enhancement).
app.get('/api/admin/analysis/stream', (req, res) => {
```

- [ ] **Step 5: Test cluster startup**

```bash
cd /Users/jimmyzmhe/Desktop/git/VEXScouting
npm run start:cluster 2>&1 | head -30
```

Expected: PM2 logs showing N instances started (N = CPU core count), all in `online` state.

```bash
npx pm2 list
```

Expected: `vexscouting-api` with status `online` for each instance.

```bash
# Run a search — should work across all cluster workers
curl -s "http://localhost:3000/api/search?q=254" | jq length
```

- [ ] **Step 6: Stop cluster and commit**

```bash
npm run stop:cluster
```

```bash
git add ecosystem.config.cjs package.json
git commit -m "feat: add PM2 cluster config for multi-core deployment"
```

---

## Phase Summary & Deployment Order

```
Phase 1 (no new infra, deploy immediately):
  Task 1 → Task 2 → Task 3 → Task 4

Phase 2 (requires Redis — provision first):
  Task 5 → Task 6 → Task 7 → Task 8

Phase 3 (process architecture — final):
  Task 9 → Task 10
```

**Estimated capacity after each phase:**

| After Phase | Estimated Comfortable Concurrent Users |
|---|---|
| Baseline (today) | ~50–100 |
| Phase 1 complete | ~200–300 |
| Phase 2 complete | ~600–800 |
| Phase 3 complete | ~1000–1500 |

---

## Risk Summary

| Risk | Likelihood | Impact | Mitigation in Plan |
|---|---|---|---|
| Railway hobby Postgres connection limit (25 max) | High | Critical | `POOL_MAX` env var; document Railway plan requirement |
| Redis unavailable on cold deploy | Medium | Low | `getOrSet` falls through to DB silently |
| Rate limits blocking competition-day burst | Medium | High | Generous limits (200/min); skip for `/api/health` |
| Analysis SSE broken in PM2 cluster | High | Low (admin-only) | Comment in code; single-process Railway deploy unaffected |
| RobotEvents API returns stale cached data during active match | Low | Medium | Short 5min TTL on rankings; acceptable trade-off |
| Child process crash on analysis | Low | Low | `exit` handler in worker class emits error log; no main process crash |
| Redis pub/sub needed for multi-node horizontal scale | Low | Medium | Out of scope; documented in Task 10 |
