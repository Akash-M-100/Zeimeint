'use strict';

const { body } = require('express-validator');

const LEAD_STATUS = ['new', 'contacted', 'enrolled', 'rejected', 'archived'];

// Slice 14 B.4: matches PlacementEnrollment.STATUS — kept in sync manually
// since pulling it from the model at load time would import the schema into
// the validators layer, breaking the one-way controller→service→model deps.
const ENROLLMENT_STATUS = [
  'active',
  'placement_in_progress',
  'placed',
  'refund_requested',
  'refunded',
  'completed',
];

// POST /api/placement-program/leads — user submits interest after passing
// the eligibility check. Phone is the only hard requirement; the rest are
// optional context for sales.
const createLeadValidator = [
  body('phone')
    .isString()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage('phone must be 7-20 characters')
    .matches(/^[+\d\s()-]+$/)
    .withMessage('phone may contain digits, spaces, +, -, and parentheses'),
  body('message')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('message must be at most 1000 characters'),
  body('preferredCallTime')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('preferredCallTime must be at most 100 characters'),
];

// PATCH /api/placement-program/leads/:leadId — admin updates lead lifecycle.
const updateLeadStatusValidator = [
  body('status')
    .isIn(LEAD_STATUS)
    .withMessage(`status must be one of: ${LEAD_STATUS.join(', ')}`),
  body('statusNotes')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('statusNotes must be at most 2000 characters'),
];

// PATCH /api/placement-program/enrollments/:enrollmentId — admin lifecycle
// + placement-outcome edits. All fields optional; the service whitelists
// which ones actually write through.
const updateEnrollmentValidator = [
  body('status')
    .optional()
    .isIn(ENROLLMENT_STATUS)
    .withMessage(`status must be one of: ${ENROLLMENT_STATUS.join(', ')}`),
  body('placedAt')
    .optional()
    .isISO8601()
    .withMessage('placedAt must be an ISO 8601 date'),
  body('placedAtCompany')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('placedAtCompany must be at most 200 characters'),
  body('placedAtRole')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('placedAtRole must be at most 200 characters'),
  body('placedAtSalary')
    .optional()
    .isNumeric()
    .withMessage('placedAtSalary must be numeric'),
  body('notes')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be at most 2000 characters'),
];

// POST /api/placement-program/refunds — admin issues a refund. paymentId is
// the Mongo _id; reason/notes are free text for audit.
const refundPaymentValidator = [
  body('paymentId')
    .isMongoId()
    .withMessage('paymentId must be a valid Mongo id'),
  body('reason')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('reason must be at most 500 characters'),
  body('notes')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be at most 2000 characters'),
];

module.exports = {
  createLeadValidator,
  updateLeadStatusValidator,
  updateEnrollmentValidator,
  refundPaymentValidator,
};
