'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Role-based authorization. Must run *after* `protect` so `req.user` exists.
 *   authorize('admin')            -> admin only
 *   authorize('admin', 'student') -> either role
 */
const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};

// Convenience guard for admin-only routes.
const isAdmin = authorize('admin');

// Content-management guard: admins and instructors may both manage course
// content (lectures + sections). Admins additionally pass every isAdmin gate.
const isAdminOrInstructor = authorize('admin', 'instructor');

module.exports = { authorize, isAdmin, isAdminOrInstructor };
