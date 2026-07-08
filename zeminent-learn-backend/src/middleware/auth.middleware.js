'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Session expired, please log in again');
    }
    throw ApiError.unauthorized('Invalid authentication token');
  }
};

/**
 * Hard auth gate. Requires a valid, non-expired Bearer token and a user that
 * still exists. Attaches the full Mongoose user document as `req.user`.
 */
const protect = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication token missing');

  const payload = verifyToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User account no longer exists');

  req.user = user;
  next();
});

/**
 * Soft auth. Attaches `req.user` if a valid token is present, otherwise lets
 * the request through as a guest. Used by routes whose response *content*
 * depends on who is asking (e.g. free-preview gating on lectures).
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
  } catch (_err) {
    // Bad/expired token on an optional route → treat as an anonymous guest.
  }
  next();
});

module.exports = { protect, optionalAuth };
