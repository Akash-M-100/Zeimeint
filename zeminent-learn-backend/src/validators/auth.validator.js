'use strict';

const { body } = require('express-validator');

const registerValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email is required'),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const adminRegisterValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email is required'),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const OAUTH_PROVIDERS = ['google', 'github'];

// Body sent by the Next.js OAuth Route Handler. Bridge secret has already
// authenticated the *caller*; these rules check the *payload*.
const oauthSignInValidator = [
  body('provider')
    .isString()
    .isIn(OAUTH_PROVIDERS)
    .withMessage(`provider must be one of: ${OAUTH_PROVIDERS.join(', ')}`),
  body('providerUserId')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('providerUserId is required'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email is required'),
  body('emailVerified')
    .isBoolean()
    .withMessage('emailVerified must be a boolean'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Name must be between 1 and 120 characters'),
];

const verifyEmailRules = [
  body('token')
    .isString()
    .withMessage('Token is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Token is required'),
];

const forgotPasswordRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email is required'),
];

const resetPasswordRules = [
  body('token')
    .isString()
    .withMessage('Token is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Token is required'),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Logged-in password change. New password must clear a higher bar than the
// register-flow 6-char minimum, and must differ from the current password.
const changePasswordValidator = [
  body('currentPassword')
    .isString()
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8, max: 100 })
    .withMessage('New password must be 8-100 characters'),
  body().custom((value) => {
    if (
      value.currentPassword &&
      value.newPassword &&
      value.currentPassword === value.newPassword
    ) {
      throw new Error('New password must differ from current password');
    }
    return true;
  }),
];

// PATCH /api/auth/me — partial update. Slice 10 introduced `name`; Slice 13
// adds instructor profile fields (bio/title/avatarKey/socialLinks/expertise/
// yearsOfExperience/isVisibleOnHomePage). All optional; only the keys present
// in the request body are updated, the rest are left alone.
const updateProfileValidator = [
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters'),
  body('bio')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must be at most 1000 characters'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must be at most 100 characters'),
  // Avatar key shape mirrors what getPresignedAvatarUploadUrl emits — guards
  // against a client trying to persist an arbitrary S3 path under their user.
  body('avatarKey')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .matches(/^avatars\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i)
    .withMessage('Invalid avatar key format'),
  body('socialLinks').optional().isObject(),
  body('socialLinks.linkedin').optional({ values: 'falsy' }).isURL(),
  body('socialLinks.twitter').optional({ values: 'falsy' }).isURL(),
  body('socialLinks.github').optional({ values: 'falsy' }).isURL(),
  body('socialLinks.website').optional({ values: 'falsy' }).isURL(),
  body('expertise')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Expertise must be an array of at most 20 tags'),
  body('expertise.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each expertise tag must be 1-30 characters'),
  body('yearsOfExperience')
    .optional({ values: 'null' })
    .isInt({ min: 0, max: 100 })
    .withMessage('yearsOfExperience must be an integer between 0 and 100'),
  body('isVisibleOnHomePage')
    .optional()
    .isBoolean()
    .withMessage('isVisibleOnHomePage must be a boolean'),
];

module.exports = {
  registerValidator,
  adminRegisterValidator,
  loginValidator,
  oauthSignInValidator,
  verifyEmailRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordValidator,
  updateProfileValidator,
};
