'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['student', 'admin', 'instructor'];
const OAUTH_PROVIDERS = ['google', 'github'];
const PASSWORD_HASH_ROUNDS = 12;

// One entry per linked OAuth identity. Subdoc has no _id of its own — the
// (provider, providerUserId) pair is the natural key, indexed below.
const oauthAccountSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: OAUTH_PROVIDERS,
      required: true,
    },
    providerUserId: {
      type: String,
      required: true,
    },
    linkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // select:false keeps the hash out of every generic query/response.
    // required only when the user has no OAuth identity linked — OAuth-first
    // signups have no password until they (optionally) set one later.
    password: {
      type: String,
      required: [
        function passwordRequired() {
          return !this.accounts || this.accounts.length === 0;
        },
        'Password is required',
      ],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'student',
    },
    accounts: {
      type: [oauthAccountSchema],
      default: [],
    },
    // Flips to true after the user clicks the link in the verification email,
    // or immediately at creation for OAuth signups (provider has already
    // verified the address).
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Only the SHA-256 hash of the token is stored — if the DB leaks, working
    // verification links don't. Cleared on successful verification.
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpiry: {
      type: Date,
      select: false,
    },
    // SHA-256 hash of the password-reset token (never the plain token). Cleared
    // once the reset completes. Short-lived — see PASSWORD_RESET_TOKEN_TTL_MS.
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      select: false,
    },
    purchasedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    // Slice 11: lifetime Full Access flag set by the package-purchase flow.
    // Legacy per-course `purchasedCourses` above is preserved for read-only
    // fallback in `hasPurchased`, but new orders write hasFullAccess only.
    hasFullAccess: {
      type: Boolean,
      default: false,
    },
    fullAccessGrantedAt: {
      type: Date,
      default: null,
    },
    // Slice 13: instructor profile fields. All optional and relevant only to
    // users with role 'instructor' or 'admin' — students can ignore them.
    // Surfaced publicly via GET /api/instructors when isVisibleOnHomePage is true.
    avatarKey: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 1000,
      trim: true,
    },
    title: {
      type: String,
      default: '',
      maxlength: 100,
      trim: true,
    },
    socialLinks: {
      linkedin: { type: String, default: '', trim: true },
      twitter: { type: String, default: '', trim: true },
      github: { type: String, default: '', trim: true },
      website: { type: String, default: '', trim: true },
    },
    expertise: {
      type: [String],
      default: [],
    },
    yearsOfExperience: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    // Visible by default — instructors can hide themselves from the
    // marketing-home roster without losing their account or content access.
    isVisibleOnHomePage: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }, // adds createdAt + updatedAt
);

// Lookup index for the OAuth sign-in flow: given a (provider, providerUserId)
// from the bridge, find the linked user in one query. Multikey on accounts.
userSchema.index({ 'accounts.provider': 1, 'accounts.providerUserId': 1 });

// Sparse so it only indexes docs that currently have a pending verification
// token. The token field clears on success, so the index stays tiny.
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });

// Sparse index for the reset-password lookup (find user by hashed token).
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

// Hash the password whenever it is set or changed — never store plain text.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, PASSWORD_HASH_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.hasPurchased = function hasPurchased(courseId) {
  // Slice 11: Full Access trumps per-course ownership. Legacy purchasedCourses
  // remains as a read-only fallback so accounts predating the pivot keep
  // their access — new orders never write to that array.
  if (this.hasFullAccess) return true;
  return this.purchasedCourses.some((id) => id.toString() === courseId.toString());
};

userSchema.methods.hasFullAccessNow = function hasFullAccessNow() {
  return Boolean(this.hasFullAccess);
};

// Never leak the password hash or __v through res.json().
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

userSchema.statics.ROLES = ROLES;
userSchema.statics.OAUTH_PROVIDERS = OAUTH_PROVIDERS;

module.exports = mongoose.model('User', userSchema);
