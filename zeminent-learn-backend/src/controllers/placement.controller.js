'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const placementService = require('../services/placement.service');
const emailService = require('../services/email.service');
const enrollmentService = require('../services/placementEnrollment.service');
const refundService = require('../services/refund.service');

// GET /api/placement-program/eligibility — does the caller have at least
// one course at 100% completion? Used by the marketing CTA to gate the
// lead-capture form.
const getEligibility = asyncHandler(async (req, res) => {
  const eligibility = await placementService.checkEligibility(req.user._id);
  res.status(200).json(new ApiResponse(200, 'Eligibility fetched', eligibility));
});

// POST /api/placement-program/leads — capture interest. Eligibility is
// re-checked server-side inside getOrCreateLead. A duplicate submission
// while an active lead exists updates the existing doc (200) rather than
// creating a new one (201) — the partial-unique index would reject the
// second create anyway; matching it explicitly gives a clean response.
const createLead = asyncHandler(async (req, res) => {
  const { phone, message, preferredCallTime } = req.body;
  const { lead, created } = await placementService.getOrCreateLead({
    userId: req.user._id,
    phone,
    message,
    preferredCallTime,
  });

  // Fire-and-forget acknowledgment email on first capture only — re-submits
  // shouldn't re-mail. Email failure must not 5xx the response: log and move
  // on so the lead is still recorded.
  if (created) {
    emailService
      .sendPlacementLeadAck({ to: req.user.email, name: req.user.name })
      .catch((err) =>
        console.error('✉️  Placement lead ack email failed:', err.message),
      );
  }

  res.status(created ? 201 : 200).json(
    new ApiResponse(
      created ? 201 : 200,
      created
        ? 'Thank you for your interest. We will reach out within 48 hours.'
        : 'Your details have been updated.',
      { lead },
    ),
  );
});

// GET /api/placement-program/leads (admin) — full queue with user + course
// projections. Optional `?status=new` etc. to filter.
const listLeads = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const leads = await placementService.listLeads({ status });
  res.status(200).json(new ApiResponse(200, 'Leads fetched', { leads }));
});

// PATCH /api/placement-program/leads/:leadId (admin) — move a lead through
// its lifecycle. Body: { status, statusNotes? }.
const updateLeadStatus = asyncHandler(async (req, res) => {
  const lead = await placementService.updateLeadStatus({
    leadId: req.params.leadId,
    status: req.body.status,
    statusNotes: req.body.statusNotes,
  });
  res.status(200).json(new ApiResponse(200, 'Lead updated', { lead }));
});

// ─── Slice 14 B.4: admin enrollments + refund ────────────────────────────

// GET /api/placement-program/enrollments (admin) — full enrollments queue
// with user + payment + lead populated. Optional ?status=...&search=...
const listEnrollments = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const enrollments = await enrollmentService.listEnrollments({ status, search });
  res
    .status(200)
    .json(new ApiResponse(200, 'Enrollments fetched', { enrollments }));
});

// GET /api/placement-program/enrollments/:enrollmentId (admin) — single doc
// with payment fully populated (not the projected subset listEnrollments uses).
const getEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await enrollmentService.getEnrollment(
    req.params.enrollmentId,
  );
  res
    .status(200)
    .json(new ApiResponse(200, 'Enrollment fetched', { enrollment }));
});

// PATCH /api/placement-program/enrollments/:enrollmentId (admin) — edit
// status + placement outcome + free-text notes. Validator gates the body
// shape; service whitelists the actual writable fields.
const updateEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await enrollmentService.updateEnrollment({
    enrollmentId: req.params.enrollmentId,
    updates: req.body,
  });
  res
    .status(200)
    .json(new ApiResponse(200, 'Enrollment updated', { enrollment }));
});

// POST /api/placement-program/refunds (admin) — issues a Razorpay refund
// and flips Payment.paymentStatus + Enrollment.status atomically (from the
// caller's perspective; service-level error wraps the Razorpay 4xx as 502).
const refundPayment = asyncHandler(async (req, res) => {
  const { paymentId, reason, notes } = req.body;
  if (!paymentId) throw ApiError.badRequest('paymentId is required');

  const result = await refundService.initiateRefund({
    paymentId,
    adminUserId: req.user._id,
    reason,
    notes,
  });

  res
    .status(200)
    .json(new ApiResponse(200, 'Refund initiated successfully', result));
});

module.exports = {
  getEligibility,
  createLead,
  listLeads,
  updateLeadStatus,
  listEnrollments,
  getEnrollment,
  updateEnrollment,
  refundPayment,
};
