const mongoose = require('mongoose');

// MongoDB connection URI from environment variable
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/familytree';

// Connect to MongoDB
mongoose.connect(MONGO_URI);

// Event listeners for connection status
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Export mongoose for use in models
module.exports = mongoose;