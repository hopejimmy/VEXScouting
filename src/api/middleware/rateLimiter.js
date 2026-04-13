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
  skip: (req) => req.path === '/api/health',
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
