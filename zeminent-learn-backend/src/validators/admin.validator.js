'use strict';

const { body, param } = require('express-validator');

const instructorIdParam = [
  param('id').isMongoId().withMessage('Invalid instructor id'),
];

const createInstructorValidator = [
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

// Partial update: every field optional, but password (when sent) must still
// satisfy the minimum length.
const updateInstructorValidator = [
  ...instructorIdParam,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters'),
  body('password')
    .optional()
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

/* ---------------- Admin account management (admin only) -------------------- */
// Stricter password policy than the codebase's `min: 6` default. Admin
// accounts are high-value targets — the change-password flow already uses
// `min: 8`; matching that bar for new-admin creation, plus a basic
// uppercase + digit complexity check.

const adminIdParam = [
  param('userId').isMongoId().withMessage('Invalid user id'),
];

// Slice 16: course-students lookup param validator.
const courseIdParam = [
  param('courseId').isMongoId().withMessage('Invalid course id'),
];

const createAdminValidator = [
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
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be 8-100 characters')
    .bail()
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least 1 uppercase letter')
    .bail()
    .matches(/[0-9]/)
    .withMessage('Password must contain at least 1 number'),
];

module.exports = {
  instructorIdParam,
  createInstructorValidator,
  updateInstructorValidator,
  adminIdParam,
  createAdminValidator,
  courseIdParam,
};
