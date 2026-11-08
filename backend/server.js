const express = require('express');
const mongoose = require('./database/config');
const PORT = process.env.PORT || 5000;

const app = express();

// Middleware
app.use(express.json());

// Basic route
app.get('/api', (req, res) => {
  res.json({ message: 'Family Tree API' });
});

// Start server after DB connection
mongoose.connection.once('open', () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});