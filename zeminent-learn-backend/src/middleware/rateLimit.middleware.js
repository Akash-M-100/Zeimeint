'use strict';

const rateLimit = require('express-rate-limit');

const jsonMessage = (message) => ({ success: false, message });

// Broad limit applied to the whole /api surface. The student app has several
// authenticated dashboard surfaces, so keep this high enough that normal
// browsing across tabs does not blank the catalogue with 429s.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1500 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many requests — please try again later'),
});

// Tighter limit on auth endpoints to slow down credential-stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many authentication attempts — please try again later'),
});

// Tight per-minute cap for the OAuth bridge. Defense-in-depth on top of the
// shared-secret guard — even if the bridge secret leaks, abuse is bounded.
const oauthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many OAuth sign-in attempts — please try again shortly'),
});

// Cap on /verify-email attempts per IP. The token is 256 bits of entropy so
// online guessing is infeasible anyway; this just slows scripted abuse.
const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many verification attempts — please try again later'),
});

// Per-user cap on resending the verification email. Keyed by user id (the
// route runs `protect` first), with an IP fallback in case auth ever changes.
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user.id) || req.ip,
  message: jsonMessage('Too many verification emails — please try again later'),
});

// Per-IP cap on forgot-password requests. Sending reset email costs money and
// could be abused to spam an inbox, so the cap is strict.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many password reset requests — please try again later'),
});

// Per-IP cap on reset-password attempts. The token is 256 bits of entropy so
// guessing is infeasible; this just slows scripted abuse.
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage('Too many password reset attempts — please try again later'),
});

// Per-user cap on in-app password changes. Mounted after `protect`, so the
// key is the user id (with IP fallback for safety if auth ever changes).
// 5 attempts per 15 minutes is enough for honest mistakes, tight enough to
// slow a session-hijack attempt at changing the password.
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user.id) || req.ip,
  message: jsonMessage('Too many password change attempts — please try again later'),
});

module.exports = {
  apiLimiter,
  authLimiter,
  oauthLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  changePasswordLimiter,
};
