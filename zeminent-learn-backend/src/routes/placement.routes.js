'use strict';

const express = require('express');
const placementController = require('../controllers/placement.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createLeadValidator,
  updateLeadStatusValidator,
  updateEnrollmentValidator,
  refundPaymentValidator,
} = require('../validators/placement.validator');

const router = express.Router();

// Every route requires authentication. The user-facing endpoints (eligibility
// + create lead) need to know who's asking; the admin endpoints need both
// auth and the admin role.
router.use(protect);

// User-facing.
router.get('/eligibility', placementController.getEligibility);
router.post(
  '/leads',
  createLeadValidator,
  validate,
  placementController.createLead,
);

// Admin-only — gates the queue + lifecycle updates behind isAdmin.
router.get('/leads', isAdmin, placementController.listLeads);
router.patch(
  '/leads/:leadId',
  isAdmin,
  updateLeadStatusValidator,
  validate,
  placementController.updateLeadStatus,
);

// Slice 14 B.4: admin enrollments management + refund. `protect` already
// applies via router.use above; only the role gate is needed here.
router.get('/enrollments', isAdmin, placementController.listEnrollments);
router.get(
  '/enrollments/:enrollmentId',
  isAdmin,
  placementController.getEnrollment,
);
router.patch(
  '/enrollments/:enrollmentId',
  isAdmin,
  updateEnrollmentValidator,
  validate,
  placementController.updateEnrollment,
);
router.post(
  '/refunds',
  isAdmin,
  refundPaymentValidator,
  validate,
  placementController.refundPayment,
);

module.exports = router;
