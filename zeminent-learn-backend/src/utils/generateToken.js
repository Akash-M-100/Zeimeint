'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Signs a short-lived JWT for a user. The payload is intentionally minimal:
 * `sub` (user id), `email`, and `role` — enough for auth + RBAC without a
 * DB hit on cheap routes. Expiry is enforced via JWT_EXPIRES_IN.
 */
const generateToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );

module.exports = generateToken;
