const mongoose = require('mongoose');

// Cache the connection between serverless invocations.
const globalWithMongo = globalThis;
if (!globalWithMongo.__familyTreeMongo) {
  globalWithMongo.__familyTreeMongo = { connection: null, promise: null };
}

const cache = globalWithMongo.__familyTreeMongo;

async function connectDB() {
  if (cache.connection) {
    return cache.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not configured');
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      .then((instance) => instance.connection);
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}

module.exports = connectDB;
