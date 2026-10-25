const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB().then(async () => {
  // Idempotent initial seed check: ensure default accounts exist without overwriting production data
  try {
    const seedDatabase = require('./utils/seedData');
    await seedDatabase({ forceReset: false });
  } catch (seedErr) {
    console.warn('[Startup] Auto-seed check notice:', seedErr.message);
  }
}).catch((err) => {
  console.error('[Startup] Failed to connect to DB initially:', err.message);
});

const app = express();

// Trust reverse proxy for accurate IP resolution on Render, Heroku, Cloudflare
app.set('trust proxy', 1);

// Security / Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  },
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 1. Root Service Health Probe (matches Render root health check / GET /)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Visteon Inventory API',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      inventory: '/api/inventory',
      stock: '/api/stock',
      dashboard: '/api/dashboard',
      reports: '/api/reports',
      settings: '/api/settings',
    },
  });
});

// 2. Comprehensive Database Health Check (GET /api/health)
app.get('/api/health', (req, res) => {
  const readyState = mongoose.connection.readyState;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const isConnected = readyState === 1;

  const healthData = {
    status: isConnected ? 'healthy' : 'unhealthy',
    service: 'Visteon Inventory API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: stateMap[readyState] || 'unknown',
      readyState,
      name: mongoose.connection.name || 'visteon_inventory',
      host: mongoose.connection.host || 'unknown',
    },
  };

  res.status(isConnected ? 200 : 503).json(healthData);
});

// Mount modular API routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/seed', require('./routes/seed'));

// Optional: Serve built frontend if deployed together as a full-stack container
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    // If request starts with /api, pass to 404 handler
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`,
  });
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Server] VISTEON Inventory API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Server Error]: ${err.message}`);
});

module.exports = app;
