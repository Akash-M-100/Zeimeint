'use strict';

const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Constant-time compare so a wrong header can't be probed via response timing.
// Buffers must be equal length, so length-mismatch is rejected up-front.
const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

/**
 * Gates POST /api/auth/oauth on the OAUTH_BRIDGE_SECRET shared with the
 * Next.js Route Handler that owns the Google / GitHub OAuth exchange.
 * Same opaque 401 for "missing" and "wrong" — callers can't enumerate.
 *
 * env.js requires OAUTH_BRIDGE_SECRET at boot, so the absence check here
 * really only catches misconfiguration after boot (e.g. someone clearing
 * the value via runtime config); it stays for defense in depth.
 */
const bridgeSecretGuard = (req, _res, next) => {
  const expected = env.oauth.bridgeSecret;
  if (!expected) {
    return next(new ApiError(503, 'OAuth bridge is not configured on this server'));
  }

  const provided = req.headers['x-bridge-secret'];
  if (!safeEqual(provided, expected)) {
    return next(ApiError.unauthorized('Invalid or missing bridge secret'));
  }
  next();
};

module.exports = { bridgeSecretGuard };
