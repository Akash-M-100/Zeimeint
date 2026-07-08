'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Trust the first proxy hop (needed for correct client IPs behind Nginx/Render/etc.,
// which keeps rate limiting accurate). Safe for single-proxy deployments.
app.set('trust proxy', 1);

/* ---------------- Security & parsing ---------------- */
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin, // array of allowed origins from env
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: '1mb',
    // Capture the raw body Buffer for the Razorpay webhook so the controller
    // can recompute the HMAC against it. Global JSON parsing runs before
    // routes mount, and the parsed object alone can't be used for signature
    // verification (whitespace normalization changes the bytes). Done here
    // via the verify hook, which receives the unparsed Buffer.
    verify: (req, _res, buf) => {
      if (req.originalUrl === '/api/payments/webhook') {
        req.rawBody = buf;
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
}

/* ---------------- Routes ---------------- */
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Zeminent LMS API',
    health: '/api/health',
  });
});

// Broad rate limit across the whole API surface.
app.use('/api', apiLimiter, routes);

/* ---------------- Error handling (must be last) ---------------- */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
