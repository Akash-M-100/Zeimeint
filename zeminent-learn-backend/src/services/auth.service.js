'use strict';

const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const generateToken = require('../utils/generateToken');
const tokenService = require('./token.service');
const emailService = require('./email.service');

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Generates a fresh verification token, persists its SHA-256 hash + expiry
// on the user, and mails the plain token. The email send is wrapped by the
// caller so a delivery failure can be handled per-flow.
const issueVerificationToken = async (user) => {
  const { plain, hashed } = tokenService.generateToken();
  user.emailVerificationToken = hashed;
  user.emailVerificationExpiry = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await user.save();
  await emailService.sendVerificationEmail(user, plain);
};

/**
 * Registers a new student. Email uniqueness is checked up-front for a clean
 * 409 message; the unique index is the real backstop against races.
 */
const registerStudent = async ({ name, email, password }) => {
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw ApiError.conflict('Email is already registered');

  // Password is hashed by the User model's pre-save hook.
  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: 'student',
  });

  // Verification email is best-effort: a transient SMTP outage shouldn't
  // 500 the registration. The user can hit /resend-verification later.
  try {
    await issueVerificationToken(user);
  } catch (err) {
    console.error('✉️  Verification email failed at register:', err.message);
  }

  return { user: user.toJSON(), token: generateToken(user) };
};

/**
 * Registers a new admin. Route-level middleware is responsible for gating
 * access (shared-secret header); this service trusts that check has passed.
 */
const registerAdmin = async ({ name, email, password }) => {
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw ApiError.conflict('Email is already registered');

  // Admins skip email verification — they're created through a gated, trusted
  // path (shared-secret header), not public self-signup.
  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: 'admin',
    isEmailVerified: true,
  });

  return { user: user.toJSON(), token: generateToken(user) };
};

/**
 * Verifies credentials and issues a JWT. The same generic error is returned
 * for unknown email vs. wrong password so the endpoint can't be used to
 * enumerate registered accounts.
 */
const login = async ({ email, password }) => {
  const normalizedEmail = String(email).toLowerCase().trim();

  // password has select:false on the schema — explicitly pull it in here.
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) throw ApiError.unauthorized('Invalid email or password');

  return { user: user.toJSON(), token: generateToken(user) };
};

/**
 * Consumes a verification token: hashes the submitted plain token, matches it
 * to an unexpired record, then flips isEmailVerified and clears the token.
 * Generic 400 covers unknown, mismatched, and expired tokens — same response
 * either way, so the endpoint isn't a token-status oracle.
 */
const verifyEmail = async (plainToken) => {
  const hashed = tokenService.hashToken(plainToken);

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpiry: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpiry');

  if (!user) throw new ApiError(400, 'Invalid or expired verification link');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();

  return user.toJSON();
};

/**
 * Re-issues a verification token for the current user. Overwrites any
 * in-flight token so the most recent link is the only working one.
 */
const resendVerification = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User account no longer exists');
  if (user.isEmailVerified) throw new ApiError(400, 'Email already verified');

  await issueVerificationToken(user);
};

/**
 * Starts the forgot-password flow. Always resolves without revealing whether
 * the email exists (anti-enumeration) — the controller returns the same
 * generic response regardless. When the account does exist, a fresh reset
 * token is stored (hashed) and the plain token is mailed; a later request
 * overwrites any in-flight token, so only the newest link works.
 */
const forgotPassword = async (email) => {
  const normalizedEmail = String(email).toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return; // Silent no-op for unknown emails.

  const { plain, hashed } = tokenService.generateToken();
  user.passwordResetToken = hashed;
  user.passwordResetExpiry = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  await user.save();

  // Best-effort: a transient SMTP failure shouldn't surface as a 500 that
  // also leaks the email's existence. Log and move on.
  try {
    await emailService.sendPasswordResetEmail(user, plain);
  } catch (err) {
    console.error('✉️  Password reset email failed:', err.message);
  }
};

/**
 * Consumes a reset token: hashes the submitted plain token, matches it to an
 * unexpired record, sets the new password (re-hashed by the model's pre-save
 * hook), then clears the token. Generic 400 covers unknown, mismatched, and
 * expired tokens so the endpoint isn't a token-status oracle.
 */
const resetPassword = async (plainToken, newPassword) => {
  const hashed = tokenService.hashToken(plainToken);

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpiry: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpiry');

  if (!user) throw new ApiError(400, 'Invalid or expired reset link');

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();
};

/**
 * Logged-in password change. Verifies the current password against the stored
 * bcrypt hash, then assigns the new password and saves — the User model's
 * pre-save hook handles re-hashing. OAuth-first accounts (no password set yet)
 * are rejected with the same generic message to avoid leaking account shape.
 */
const changePassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User account no longer exists');
  if (!user.password) throw ApiError.badRequest('Current password incorrect');

  const matches = await user.comparePassword(currentPassword);
  if (!matches) throw ApiError.badRequest('Current password incorrect');

  user.password = newPassword;
  await user.save();
};

// Slice 13: instructor profile expansion. Allowlist lives here (not in the
// controller) so any other future caller goes through the same gate.
const PROFILE_ALLOWED_FIELDS = [
  'name',
  'bio',
  'title',
  'avatarKey',
  'socialLinks',
  'expertise',
  'yearsOfExperience',
  'isVisibleOnHomePage',
];

/**
 * Partial update of the authenticated user's profile. The validator already
 * rejected disallowed shapes; this allowlist guards against any field the
 * validator doesn't mention (e.g. attempts to set role / hasFullAccess /
 * password via PATCH). runValidators enforces the schema-level constraints.
 */
const updateProfile = async ({ userId, patch }) => {
  const updates = {};
  for (const key of PROFILE_ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      updates[key] = patch[key];
    }
  }

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw ApiError.notFound('User account no longer exists');
  return user.toJSON();
};

module.exports = {
  registerStudent,
  registerAdmin,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
};
