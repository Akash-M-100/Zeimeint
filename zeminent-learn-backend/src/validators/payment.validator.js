'use strict';

const { body } = require('express-validator');

// Slice 14 B.2: SKU-aware order. Validates productType, full billing
// address (required for tax invoice), optional buyer GSTIN, and optional
// terms-acceptance payload. The controller separately enforces that
// terms are present for placement_program orders.
const createOrderValidator = [
  body('productType')
    .isIn(['full_access', 'placement_program'])
    .withMessage('productType must be full_access or placement_program'),

  body('billingAddress.name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('billingAddress.name is required (1-200 chars)'),
  body('billingAddress.line1')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('billingAddress.line1 is required (1-200 chars)'),
  body('billingAddress.line2')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 200 }),
  body('billingAddress.city')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('billingAddress.city is required (1-100 chars)'),
  body('billingAddress.state')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('billingAddress.state is required (1-100 chars)'),
  body('billingAddress.stateCode')
    .isString()
    .trim()
    .matches(/^\d{2}$/)
    .withMessage('billingAddress.stateCode must be 2 digits'),
  body('billingAddress.pincode')
    .isString()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('billingAddress.pincode must be 6 digits'),
  body('billingAddress.country')
    .optional({ values: 'falsy' })
    .isString()
    .trim()
    .isLength({ max: 100 }),

  // Indian GSTIN format: 2 digits state code + 5 letters (PAN block 1)
  // + 4 digits + 1 letter + 1 digit/letter + Z + 1 alphanumeric checksum.
  body('buyerGSTIN')
    .optional({ nullable: true, values: 'falsy' })
    .isString()
    .trim()
    .matches(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[\dA-Z]{1}$/)
    .withMessage('buyerGSTIN does not match the Indian GSTIN format'),

  // Terms-acceptance payload — optional at the validator layer; the
  // controller hard-requires it for placement_program orders so the
  // error message is product-specific ("Terms acceptance is required for
  // placement enrollment") rather than a generic field-level rejection.
  body('termsAccepted')
    .optional({ nullable: true })
    .isObject()
    .withMessage('termsAccepted must be an object'),
  body('termsAccepted.version')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('termsAccepted.version is required (1-50 chars)'),
  body('termsAccepted.acceptedAt')
    .optional()
    .isISO8601()
    .withMessage('termsAccepted.acceptedAt must be an ISO8601 timestamp'),
];

const verifyPaymentValidator = [
  body('razorpay_order_id')
    .trim()
    .notEmpty()
    .withMessage('razorpay_order_id is required'),
  body('razorpay_payment_id')
    .trim()
    .notEmpty()
    .withMessage('razorpay_payment_id is required'),
  body('razorpay_signature')
    .trim()
    .notEmpty()
    .withMessage('razorpay_signature is required'),
];

module.exports = { createOrderValidator, verifyPaymentValidator };
