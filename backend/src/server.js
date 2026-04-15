const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const sponsorRoutes = require('./routes/sponsors');
const searchRoutes = require('./routes/search');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/search', searchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.API_PORT || 4000;
app.listen(PORT, () => {
  console.log(`KidSpot London API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/search/venues - Search venues by location`);
  console.log(`  GET  /api/search/venues/:id/details - Get venue details`);
  console.log(`  GET  /api/sponsors/stats - Get sponsor statistics`);
  console.log(`  GET  /api/sponsors/venues - Get sponsored venues`);
  console.log(`  GET  /api/sponsors/venues/:id - Get venue sponsor details`);
  console.log(`  PUT  /api/sponsors/venues/:id/tier - Update sponsor tier (admin)`);
  console.log(`  POST /api/sponsors/venues/bulk/tier - Bulk update sponsor tiers (admin)`);
  console.log(`  GET  /api/sponsors/pricing - Get sponsor pricing`);
});

module.exports = app;
