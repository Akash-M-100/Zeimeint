'use strict';

const crypto = require('crypto');

// Single-use tokens for email verification and password reset.
// We mail the `plain` token to the user and persist only the `hashed` form,
// so a database leak doesn't yield working tokens.
const generateToken = () => {
  const plain = crypto.randomBytes(32).toString('hex');
  const hashed = hashToken(plain);
  return { plain, hashed };
};

const hashToken = (plain) => crypto.createHash('sha256').update(plain).digest('hex');

module.exports = { generateToken, hashToken };
