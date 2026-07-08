'use strict';

const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connects to MongoDB. Rejects on the initial connection failure so the
 * caller (server.js) can abort startup instead of serving a brain-dead API.
 */
const connectDB = async () => {
  mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));
  mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));

  // Strict query keeps typo'd filter fields from silently matching nothing.
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
};

module.exports = connectDB;
