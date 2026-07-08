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
 * Gates POST /api/auth/admin/register on a shared secret sent as the
 * `x-admin-register-secret` header. If ADMIN_REGISTER_SECRET is not configured
 * the endpoint is disabled entirely — that prevents an empty default from
 * accidentally accepting empty headers as valid in production.
 */
const requireAdminRegisterSecret = (req, _res, next) => {
  const expected = env.admin.registerSecret;
  if (!expected) {
    return next(new ApiError(503, 'Admin registration is disabled on this server'));
  }

  const provided = req.headers['x-admin-register-secret'];
  if (!safeEqual(provided, expected)) {
    return next(ApiError.forbidden('Invalid or missing admin registration secret'));
  }
  next();
};

module.exports = { requireAdminRegisterSecret };
