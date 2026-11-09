const express = require('express');
const cors = require('cors');
const connectDB = require('./database/config');
const authRoutes = require('./routes/auth');
const familiesRoutes = require('./routes/families');
const peopleRoutes = require('./routes/people');
const treeRoutes = require('./routes/trees');

const app = express();
app.disable('x-powered-by');

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: configuredOrigins.length ? configuredOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
// GEDCOM imports are parsed in the browser and sent as a compact JSON payload.
// Vercel caps request bodies at 4.5 MB, so keep a little headroom.
app.use(express.json({ limit: '4mb' }));

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    res.status(503).json({ error: 'Database connection failed' });
  }
});

app.get('/api', (req, res) => {
  res.json({ message: 'Family Tree API' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/families', familiesRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/trees', treeRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, _next) => {
  console.error(error);

  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors)
      .map((entry) => entry.message)
      .join(', ');
    return res.status(400).json({ error: message });
  }

  if (error.code === 11000) {
    return res.status(409).json({ error: 'That value is already in use' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Import file is too large' });
  }

  return res
    .status(error.status || 500)
    .json({ error: error.status ? error.message : 'Internal server error' });
});

module.exports = app;
