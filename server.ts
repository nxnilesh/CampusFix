import 'dotenv/config';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { authenticateUser } from './server/auth.js';
import authRoutes from './server/routes/authRoutes.js';
import issueRoutes from './server/routes/issueRoutes.js';
import resolverRoutes from './server/routes/resolverRoutes.js';
import categoryRoutes from './server/routes/categoryRoutes.js';
import serviceRoutes from './server/routes/serviceRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import notificationRoutes from './server/routes/notificationRoutes.js';
import uploadRoutes from './server/routes/uploadRoutes.js';

async function startServer() {
  const app = express();
  const PORT = Number.parseInt(process.env.PORT || '3000', 10);

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // CORS Middleware for API
  const allowedOrigin = process.env.CORS_ORIGIN || `http://localhost:${PORT}`;
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin === allowedOrigin || origin.startsWith('http://localhost:'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, x-auth-token'
      );
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(authenticateUser);

  // Serve uploaded images directory
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'CampusFix Production API',
      database: 'PostgreSQL (Prisma)',
      timestamp: new Date().toISOString(),
    });
  });

  // REST API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/issues', issueRoutes);
  app.use('/api/resolver', resolverRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/upload', uploadRoutes);

  // Vite middleware in dev / Static file serving in production
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
