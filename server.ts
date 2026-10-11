import 'dotenv/config';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { authenticateUser } from './server/auth.js';
import {
  prisma,
  isDatabaseConnectionError,
  logDatabaseError,
  DATABASE_UNAVAILABLE_MESSAGE,
} from './server/db.js';
import authRoutes from './server/routes/authRoutes.js';
import issueRoutes from './server/routes/issueRoutes.js';
import resolverRoutes from './server/routes/resolverRoutes.js';
import categoryRoutes from './server/routes/categoryRoutes.js';
import serviceRoutes from './server/routes/serviceRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import notificationRoutes from './server/routes/notificationRoutes.js';
import uploadRoutes from './server/routes/uploadRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import voteRoutes from './server/routes/voteRoutes.js';
import publicRoutes from './server/routes/publicRoutes.js';

// ---------------------------------------------------------------------------
// In-memory rate limiter — avoids adding a new dep while being production-safe.
// For high-traffic deployments, replace with the 'express-rate-limit' package.
// ---------------------------------------------------------------------------
interface RateEntry { count: number; resetAt: number }
function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateEntry>();
  // Clean expired entries every 5 minutes to prevent memory growth
  setInterval(() => {
    const now = Date.now();
    store.forEach((v, k) => { if (v.resetAt < now) store.delete(k); });
  }, 5 * 60 * 1000);

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a moment and try again.',
      });
      return;
    }
    next();
  };
}

// Rate limiters
const globalLimiter = createRateLimiter(200, 60_000);   // 200 req/min per IP
const authLimiter   = createRateLimiter(10, 60_000);    // 10 login/register attempts per min
const uploadLimiter = createRateLimiter(20, 60_000);    // 20 uploads per min

async function startServer() {
  const app = express();
  const PORT = Number.parseInt(process.env.PORT || '3000', 10);

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('[CampusFix] Database connected successfully.');
  } catch (error) {
    logDatabaseError('Database connection failed during startup:', error);
    throw new Error('CampusFix could not connect to PostgreSQL. Verify DATABASE_URL and DIRECT_URL configuration.');
  }

  // ---------------------------------------------------------------------------
  // Security Headers (Helmet-equivalent manual implementation)
  // These headers are production-safe and do not require a new dependency.
  // ---------------------------------------------------------------------------
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    // Strict CSP in production — allow camera for issue photo capture
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self' data:;"
      );
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    next();
  });

  // ---------------------------------------------------------------------------
  // CORS Middleware for API
  // ---------------------------------------------------------------------------
  const allowedOrigin = process.env.CORS_ORIGIN || `http://localhost:${PORT}`;
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin === allowedOrigin || (!process.env.CORS_ORIGIN && origin.startsWith('http://localhost:')))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ---------------------------------------------------------------------------
  // Core Middlewares
  // ---------------------------------------------------------------------------
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Global rate limiting on all API routes
  app.use('/api', globalLimiter);

  // Attach user from JWT/cookie (non-blocking — sets req.user or leaves undefined)
  app.use(authenticateUser);

  // ---------------------------------------------------------------------------
  // Static uploads directory
  // ---------------------------------------------------------------------------
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------
  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.json({
        status: 'ok',
        service: 'CampusFix Production API',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logDatabaseError('Database health check failed:', error);
      const unavailable = isDatabaseConnectionError(error);
      return res.status(unavailable ? 503 : 500).json({
        status: 'error',
        database: unavailable ? 'unavailable' : 'error',
        error: unavailable ? DATABASE_UNAVAILABLE_MESSAGE : 'Database health check failed.',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ---------------------------------------------------------------------------
  // REST API Routes
  // ---------------------------------------------------------------------------
  app.use('/api/auth',          authLimiter, authRoutes);
  app.use('/api/issues',        issueRoutes);
  app.use('/api/resolver',      resolverRoutes);
  app.use('/api/categories',    categoryRoutes);
  app.use('/api/services',      serviceRoutes);
  app.use('/api/users',         userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/upload',        uploadLimiter, uploadRoutes);
  app.use('/api/admin',         adminRoutes);
  app.use('/api/votes',         voteRoutes);
  app.use('/api/public',        publicRoutes);

  // ---------------------------------------------------------------------------
  // 404 handler for unmatched /api/* routes (must come after all route registrations)
  // ---------------------------------------------------------------------------
  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found.' });
  });

  app.use(
    (
      error: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (!req.path.startsWith('/api/')) return next(error);
      if (res.headersSent) return next(error);

      const candidate =
        error && typeof error === 'object'
          ? (error as { name?: unknown; message?: unknown; status?: unknown; statusCode?: unknown })
          : {};
      const message =
        typeof candidate.message === 'string'
          ? candidate.message.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, 'postgresql://[REDACTED]')
          : String(error).replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, 'postgresql://[REDACTED]');
      const statusCode =
        typeof candidate.status === 'number'
          ? candidate.status
          : typeof candidate.statusCode === 'number'
          ? candidate.statusCode
          : 500;

      console.error('[CampusFix] API request error:', {
        name: typeof candidate.name === 'string' ? candidate.name : 'UnknownError',
        statusCode,
        message,
      });

      if (statusCode >= 400 && statusCode < 500) {
        return res.status(statusCode).json({
          success: false,
          error: 'Invalid request. Please review the submitted data.',
        });
      }
      return res.status(500).json({
        success: false,
        error: DATABASE_UNAVAILABLE_MESSAGE,
      });
    }
  );

  // ---------------------------------------------------------------------------
  // Vite dev middleware OR production static serving
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🚀 CampusFix is running in ${process.env.NODE_ENV || 'development'} mode!`);
    console.log(`  ➜  Local:   http://localhost:${PORT}`);
    console.log(`  ➜  Network: http://127.0.0.1:${PORT}\n`);
  });
}

startServer().catch((err) => {
  console.error('[CampusFix] Failed to start server:', err);
  process.exit(1);
});
