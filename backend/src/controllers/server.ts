import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { db } from './clients/db.js';
import { httpLogger, logger } from './config/logger.js';
import { redis } from './clients/redis.js';
import { apiLimiter } from './middleware/rateLimit.js';

// Import routes
import sponsorRoutes from './routes/sponsors.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';
import claimRoutes from './routes/claim.js';
import billingRoutes from './routes/billing.js';
import ownerRoutes from './routes/owner.js';
import fhrsRoutes from './routes/fhrs.js';
import metricsRoutes from './routes/metrics.js';

// Create Express app
const app = express();

// Trust proxy for rate limiting (ngrok/proxies)
app.set('trust proxy', 1);

// Set up logging middleware
app.use(httpLogger);

// Security middleware with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.search.brave.com", "https://places.googleapis.com", "https://overpass-api.de", "https://maps.googleapis.com"]
    }
  }
}));

// CORS - Lock to production origins; fall back to permissive in development
const CORS_ALLOWED = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : (process.env.NODE_ENV === 'production' ? ['https://kidspot.london', 'https://www.kidspot.london'] : true);
app.use(cors({
  origin: CORS_ALLOWED,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-ingest-timestamp', 'x-ingest-signature']
}));

// Rate limiting - now Redis-backed
app.use('/api/', apiLimiter);

// Body parsing
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Basic health check (liveness)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.3.0'
  });
});

// Deep health check (readiness)
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check Postgres
    await db.query('SELECT 1');
    
    // Check Redis
    const redisPing = await redis.ping();
    if (redisPing !== 'PONG') throw new Error('Redis ping failed');
    
    res.json({
      status: 'ready',
      database: 'connected',
      redis: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Ready check failed');
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/venues', claimRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/fhrs', fhrsRoutes);
app.use('/metrics', metricsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, 'Unhandled request error');
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.API_PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    logger.info({ port: PORT }, 'KidSpot London API server starting...');
    
    try {
      // Verify DB connection
      await db.query('SELECT 1');
      logger.info('Database connection verified');
      
      // Verify Redis connection
      const redisPing = await redis.ping();
      if (redisPing === 'PONG') {
        logger.info('Redis connection verified');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to verify connections on startup');
      // We don't exit here to allow the app to start and respond to health checks with 503
    }
  });
}

export default app;
