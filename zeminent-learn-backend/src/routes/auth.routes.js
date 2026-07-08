'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const {
  authLimiter,
  oauthLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  changePasswordLimiter,
} = require('../middleware/rateLimit.middleware');
const validate = require('../middleware/validate.middleware');
const { requireAdminRegisterSecret } = require('../middleware/adminRegisterSecret.middleware');
const { bridgeSecretGuard } = require('../middleware/bridgeSecret.middleware');
const {
  registerValidator,
  adminRegisterValidator,
  loginValidator,
  oauthSignInValidator,
  verifyEmailRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordValidator,
  updateProfileValidator,
} = require('../validators/auth.validator');

const router = express.Router();

// Public — rate-limited to slow brute-force / credential stuffing.
router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/admin/login', authLimiter, loginValidator, validate, authController.adminLogin);
router.post(
  '/instructor/login',
  authLimiter,
  loginValidator,
  validate,
  authController.instructorLogin,
);

// Gated admin creation — requires the x-admin-register-secret header to match
// ADMIN_REGISTER_SECRET in .env. Disabled (503) if the env var isn't set.
router.post(
  '/admin/register',
  authLimiter,
  requireAdminRegisterSecret,
  adminRegisterValidator,
  validate,
  authController.adminRegister,
);

// Server-to-server bridge from the Next.js OAuth Route Handler. Auth comes
// from the X-Bridge-Secret header (OAUTH_BRIDGE_SECRET in .env); the BFF is
// the only intended caller. Don't expose this directly to browsers.
router.post(
  '/oauth',
  bridgeSecretGuard,
  oauthLimiter,
  oauthSignInValidator,
  validate,
  authController.oauthSignIn,
);

// Email verification — public. The token in the body is sent to the user's
// inbox, so possession is the only auth needed.
router.post(
  '/verify-email',
  verifyEmailLimiter,
  verifyEmailRules,
  validate,
  authController.verifyEmail,
);

// Resend a verification email to the currently authenticated user. `protect`
// runs first so the limiter can key off req.user.id.
router.post(
  '/resend-verification',
  protect,
  resendVerificationLimiter,
  authController.resendVerification,
);

// Forgot / reset password — public. The token mailed to the user's inbox is
// the only auth. forgot-password is anti-enumeration (same response either way).
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordRules,
  validate,
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  resetPasswordLimiter,
  resetPasswordRules,
  validate,
  authController.resetPassword,
);

// Protected.
router.get('/me', protect, authController.getProfile);
router.patch(
  '/me',
  protect,
  updateProfileValidator,
  validate,
  authController.updateProfile,
);
router.post(
  '/change-password',
  protect,
  changePasswordLimiter,
  changePasswordValidator,
  validate,
  authController.changePassword,
);

// Slice 13: avatar upload presign. Authenticated; returns { key, uploadUrl }.
// The browser PUTs the bytes directly to S3, then PATCHes /me with the key.
router.post('/me/avatar/presign', protect, authController.presignAvatar);

module.exports = router;
