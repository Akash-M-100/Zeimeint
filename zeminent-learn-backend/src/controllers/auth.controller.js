'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const authService = require('../services/auth.service');
const oauthService = require('../services/oauth.service');
const s3Service = require('../services/s3.service');
const { enrichUserWithAvatarUrl } = require('../utils/userResponse');

// POST /api/auth/register — student signup
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const data = await authService.registerStudent({ name, email, password });
  data.user = await enrichUserWithAvatarUrl(data.user);
  res.status(201).json(new ApiResponse(201, 'Registration successful', data));
});

// POST /api/auth/admin/register — gated by x-admin-register-secret header
const adminRegister = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const data = await authService.registerAdmin({ name, email, password });
  data.user = await enrichUserWithAvatarUrl(data.user);
  res.status(201).json(new ApiResponse(201, 'Admin registration successful', data));
});

// POST /api/auth/login — login for any role (student or admin)
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await authService.login({ email, password });
  data.user = await enrichUserWithAvatarUrl(data.user);
  res.status(200).json(new ApiResponse(200, 'Login successful', data));
});

// POST /api/auth/admin/login — login that additionally requires the admin role
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await authService.login({ email, password });
  if (data.user.role !== 'admin') {
    throw ApiError.forbidden('This account does not have admin access');
  }
  data.user = await enrichUserWithAvatarUrl(data.user);
  res.status(200).json(new ApiResponse(200, 'Admin login successful', data));
});

// POST /api/auth/instructor/login — login that additionally requires the
// instructor role. Keeps the instructor panel separate from the admin panel.
const instructorLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await authService.login({ email, password });
  if (data.user.role !== 'instructor') {
    throw ApiError.forbidden('This account does not have instructor access');
  }
  data.user = await enrichUserWithAvatarUrl(data.user);
  res.status(200).json(new ApiResponse(200, 'Instructor login successful', data));
});

// GET /api/auth/me — current user's profile (requires auth)
const getProfile = asyncHandler(async (req, res) => {
  await req.user.populate('purchasedCourses', 'title thumbnail price category');
  const user = await enrichUserWithAvatarUrl(req.user);
  res.status(200).json(new ApiResponse(200, 'Profile fetched', { user }));
});

// POST /api/auth/oauth — server-to-server sign-in from the Next.js OAuth
// Route Handler. The bridgeSecretGuard middleware authenticates the caller;
// the service handles the 3-branch upsert (find-by-link → link-by-email → create).
const oauthSignIn = asyncHandler(async (req, res) => {
  const { provider, providerUserId, email, emailVerified, name } = req.body;
  const data = await oauthService.oauthSignIn({
    provider,
    providerUserId,
    email,
    emailVerified,
    name,
  });
  data.user = await enrichUserWithAvatarUrl(data.user);
  res.status(200).json(new ApiResponse(200, 'OAuth sign-in successful', data));
});

// POST /api/auth/verify-email — public; consumes the token from the email link.
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await authService.verifyEmail(token);
  res.status(200).json(new ApiResponse(200, 'Email verified successfully', null));
});

// POST /api/auth/resend-verification — authenticated; reissues a token to the
// current user. Authorization is implicit: we always email req.user.
const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.user.id);
  res.status(200).json(new ApiResponse(200, 'Verification email sent', null));
});

// POST /api/auth/forgot-password — public. Always responds with the same
// generic message so the endpoint can't be used to discover which emails
// have accounts.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  res
    .status(200)
    .json(
      new ApiResponse(200, 'If an account exists for that email, a reset link has been sent', null),
    );
});

// POST /api/auth/reset-password — public; consumes the token from the email
// link and sets the new password.
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  res.status(200).json(new ApiResponse(200, 'Password reset successful — you can now sign in', null));
});

// POST /api/auth/change-password — authenticated user changes their own
// password. Generic 400 on a wrong current password (matches login's
// anti-enumeration tone).
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword({
    userId: req.user._id,
    currentPassword,
    newPassword,
  });
  res.status(200).json(new ApiResponse(200, 'Password changed successfully', null));
});

// PATCH /api/auth/me — authenticated user updates their own profile. The
// allowlist lives in the service (PROFILE_ALLOWED_FIELDS) and the validator
// vets the shape of each field, so this controller just forwards the body.
const updateProfile = asyncHandler(async (req, res) => {
  const user = await enrichUserWithAvatarUrl(
    await authService.updateProfile({
      userId: req.user._id,
      patch: req.body,
    }),
  );
  res.status(200).json(new ApiResponse(200, 'Profile updated', { user }));
});

// POST /api/auth/me/avatar/presign — issues a presigned S3 PUT URL the
// browser uses to upload an avatar directly. After upload the client must
// PATCH /api/auth/me with the returned `key` to persist it on the user
// document (the validator enforces the avatars/<uuid>.<ext> shape).
const presignAvatar = asyncHandler(async (req, res) => {
  const { contentType } = req.body || {};
  if (!contentType) throw ApiError.badRequest('contentType is required');
  const { key, uploadUrl } = await s3Service.getPresignedAvatarUploadUrl({
    contentType,
  });
  res
    .status(200)
    .json(new ApiResponse(200, 'Avatar upload URL issued', { key, uploadUrl }));
});

module.exports = {
  register,
  adminRegister,
  login,
  adminLogin,
  instructorLogin,
  getProfile,
  oauthSignIn,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  presignAvatar,
};
