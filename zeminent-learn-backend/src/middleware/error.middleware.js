'use strict';

const env = require('../config/env');

/**
 * 404 handler — reached when no route matched. Forwards to the error handler
 * with a consistent shape.
 */
const notFound = (req, _res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

/**
 * Centralized error handler. Normalizes ApiError, Mongoose, JWT and Multer
 * failures into the standard `{ success:false, message, errors? }` envelope.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = Array.isArray(err.errors) ? err.errors : [];

  // Mongoose: malformed ObjectId in a query/param.
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  }

  // Mongoose: schema validation failed.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Mongoose: unique index violation.
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
  }

  // Multer: upload-related failures (size limit, etc.).
  if (err.name === 'MulterError') {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Video file is too large'
        : `Upload error: ${err.message}`;
  }

  // 5xx are unexpected — log the full error server-side for debugging.
  if (statusCode >= 500) {
    console.error('💥 Unhandled error:', err);
  }

  const body = {
    success: false,
    message,
  };
  if (errors.length) body.errors = errors;
  // Expose stack only for server faults in development.
  if (env.nodeEnv === 'development' && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
