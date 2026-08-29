// server.js — Hardened API entry point with PostgreSQL
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const authRouter = require('./routes/auth');
const deliveryRouter = require('./routes/delivery');
const financeRouter = require('./routes/finance');
const agenciesRouter = require('./routes/agencies');
const { createSafeStaticServer } = require('./middleware/pathSecurity');
const { requireApiKey } = require('./middleware/apiKey');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// 1. HTTP Security Headers (Helmet)
// Configured to allow cross-origin image resources while enforcing strict security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS configuration
const allowedOrigins = CLIENT_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by CORS'), false);
    },
    credentials: true,
  })
);

// 3. Body parsers with size limit defense
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. General API Rate Limiting (Defense against DDoS and aggressive scrapers)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api', generalLimiter);

// 4.5 Shared API Key Gate — every /api request must carry the frontend's X-API-Key,
// except the health check (used by uptime monitors that won't have the key).
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return requireApiKey(req, res, next);
});

// 5. Protected & Sanitized Static Upload Delivery (Path Traversal Protection)
const uploadsDirectory = path.resolve(__dirname, 'uploads');
app.use('/uploads', createSafeStaticServer(uploadsDirectory));

// 6. API Route Mounting
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/delivery', deliveryRouter);
app.use('/api/finance', financeRouter);
app.use('/api/agencies', agenciesRouter);

// Automatic DB initialization middleware for serverless invocations
app.use(async (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/health' || req.path === '/') return next();
  try {
    await db.ensureDbInitialized();
  } catch (err) {
    console.error('[DB Init Error]', err.message);
  }
  next();
});

// Root & Health check endpoints
const healthHandler = async (req, res) => {
  let dbStatus = 'ok';
  try {
    await db.query('SELECT 1');
  } catch (err) {
    dbStatus = `unreachable: ${err.message}`;
  }

  const apiKeyConfigured = Boolean(process.env.API_KEY && process.env.API_KEY.length >= 16);
  const jwtConfigured = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32);
  const databaseConfigured = Boolean(process.env.DATABASE_URL || process.env.MYSQL_HOST || process.env.DB_HOST);

  const isHealthy = dbStatus === 'ok' && apiKeyConfigured && jwtConfigured && databaseConfigured;

  res.json({
    status: isHealthy ? 'ok' : 'degraded',
    message: 'Mador Shopping Backend API',
    database: dbStatus,
    environment: {
      apiKeyConfigured,
      jwtConfigured,
      databaseConfigured,
      uploadThingConfigured: Boolean(process.env.UPLOADTHING_TOKEN || process.env.UPLOADTHING_SECRET),
    },
    timestamp: new Date().toISOString(),
    security: {
      jwt: jwtConfigured,
      apiKey: apiKeyConfigured,
      rateLimit: true,
      pathTraversalProtection: true,
      helmetHeaders: true,
    },
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
app.get('/', (req, res) => {
  res.json({
    message: 'Mador Shopping Backend API is running.',
    healthEndpoint: '/api/health',
    version: '1.0.0',
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  if (err && err.message === 'CORS policy: Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS forbidden' });
  }
  console.error('[API Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start server after ensuring DB connection & schema initialization (for local standalone run)
let server;
if (require.main === module) {
  db.initDB()
    .then(() => {
      server = app.listen(PORT, () => {
        console.log(`[DZ Shop] Hardened API with MySQL running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[Database Error] Failed to initialize MySQL database on startup:', err.message);
      console.warn('[Server Startup] Starting HTTP server in degraded mode...');
      server = app.listen(PORT, () => {
        console.log(`[DZ Shop] Hardened API running (Degraded DB) on http://localhost:${PORT}`);
      });
    });
}

module.exports = app;
module.exports.app = app;
module.exports.initDB = db.initDB;

