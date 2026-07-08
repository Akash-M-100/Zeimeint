'use strict';

const PlacementEnrollment = require('../models/placementEnrollment.model');
const ApiError = require('../utils/ApiError');

// Slice 14 B.4: admin-facing CRUD for the enrollments table. Distinct from
// placement.service which owns the lead funnel + eligibility checks; this
// owns the post-payment lifecycle (active → placement_in_progress → placed
// or → refunded via refund.service).

// Whitelist of admin-editable fields. Anything not on this list (userId,
// paymentId, termsAccepted snapshot, refundEligibleUntil window, etc.) is
// frozen — those are audit-trail / linkage fields that must not change.
const ALLOWED_UPDATE_FIELDS = [
  'status',
  'placedAt',
  'placedAtCompany',
  'placedAtRole',
  'placedAtSalary',
  'notes',
];

/**
 * Admin queue list. Populates the joins the admin UI cares about:
 * - user identity (name + email)
 * - payment money trail (amount, invoice number, razorpay ref, status)
 * - lead context (phone, preferred call time) when an upstream lead exists
 *
 * Status filter is index-backed (placementEnrollmentSchema indexes status).
 * Search is done in-memory post-populate because user fields live on a
 * different collection — a $lookup-aware aggregation would be a refactor
 * we don't need at admin-queue scale.
 */
const listEnrollments = async ({ status, search } = {}) => {
  const filter = {};
  if (status) filter.status = status;

  let enrollments = await PlacementEnrollment.find(filter)
    .populate('userId', 'name email')
    .populate(
      'paymentId',
      'amount invoiceNumber invoiceIssuedAt razorpayPaymentId paymentStatus',
    )
    .populate('placementLeadId', 'phone preferredCallTime')
    .sort({ createdAt: -1 })
    .lean();

  if (search) {
    const s = search.toLowerCase();
    enrollments = enrollments.filter(
      (e) =>
        e.userId?.name?.toLowerCase().includes(s) ||
        e.userId?.email?.toLowerCase().includes(s),
    );
  }

  return enrollments;
};

const getEnrollment = async (enrollmentId) => {
  const enrollment = await PlacementEnrollment.findById(enrollmentId)
    .populate('userId', 'name email')
    .populate('paymentId')
    .populate('placementLeadId')
    .lean();
  if (!enrollment) throw ApiError.notFound('Enrollment not found');
  return enrollment;
};

const updateEnrollment = async ({ enrollmentId, updates }) => {
  const enrollment = await PlacementEnrollment.findById(enrollmentId);
  if (!enrollment) throw ApiError.notFound('Enrollment not found');

  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (updates[key] !== undefined) {
      enrollment[key] = updates[key];
    }
  }

  // Auto-stamp placedAt on first transition to 'placed' — admin filling in
  // company/role/salary shouldn't need to also pass today's date.
  if (updates.status === 'placed' && !enrollment.placedAt) {
    enrollment.placedAt = new Date();
  }

  await enrollment.save();
  return enrollment;
};

module.exports = { listEnrollments, getEnrollment, updateEnrollment };
