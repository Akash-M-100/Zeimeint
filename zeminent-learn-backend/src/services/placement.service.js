'use strict';

const PlacementLead = require('../models/placementLead.model');
const progressService = require('./progress.service');
const ApiError = require('../utils/ApiError');

/**
 * Reads progressService.getSummary() and returns whether the user has at
 * least one course at 100% completion — the eligibility predicate for the
 * Placement Guarantee Program.
 *
 * `progressService.getSummary()` is the source of truth for what counts as
 * a "completed course" at the rollup level (see its comment block). Reusing
 * it here means the eligibility check stays in sync with what the dashboard
 * already shows the user.
 *
 * @returns {{ eligible: boolean, reason: string|null, completedCourseIds: string[] }}
 */
const checkEligibility = async (userId) => {
  const summary = await progressService.getSummary({ userId });
  const completed = summary.filter((s) => s.percent >= 100);

  if (completed.length === 0) {
    return {
      eligible: false,
      reason:
        'Complete at least one course to unlock the Placement Guarantee Program.',
      completedCourseIds: [],
    };
  }

  return {
    eligible: true,
    reason: null,
    completedCourseIds: completed.map((c) => c.courseId),
  };
};

/**
 * Get-or-create the user's active PlacementLead. Re-checks eligibility
 * server-side so a client that bypasses the UI gate can't sneak through.
 *
 * Re-submission semantics: if the user already has an active lead (status
 * 'new' or 'contacted'), this updates the contact fields on it rather than
 * creating a duplicate. The partial-filter unique index would reject a
 * second active doc anyway; matching that explicitly gives a clean UX.
 *
 * @returns {Promise<{ lead: object, created: boolean }>}
 */
const getOrCreateLead = async ({ userId, phone, message, preferredCallTime }) => {
  const eligibility = await checkEligibility(userId);
  if (!eligibility.eligible) throw ApiError.badRequest(eligibility.reason);

  const existing = await PlacementLead.findOne({
    userId,
    status: { $in: ['new', 'contacted'] },
  });

  if (existing) {
    existing.phone = phone;
    if (message !== undefined) existing.message = message;
    if (preferredCallTime !== undefined) {
      existing.preferredCallTime = preferredCallTime;
    }
    await existing.save();
    return { lead: existing, created: false };
  }

  const lead = await PlacementLead.create({
    userId,
    phone,
    message: message || '',
    preferredCallTime: preferredCallTime || '',
    eligibleAt: new Date(),
    completedCourseIds: eligibility.completedCourseIds,
    status: 'new',
  });
  return { lead, created: true };
};

/**
 * Admin-only: list every lead, optionally filtered by status. Populates the
 * user (name + email) and completed-course titles so the admin panel can
 * render a queue without N+1 lookups.
 */
const listLeads = async ({ status } = {}) => {
  const filter = {};
  if (status) filter.status = status;

  return PlacementLead.find(filter)
    .populate('userId', 'name email')
    .populate('completedCourseIds', 'title')
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Admin-only: move a lead through its lifecycle. Stamps `contactedAt` /
 * `enrolledAt` on the first transition into those states; idempotent on
 * later same-status updates (re-saving 'contacted' doesn't overwrite the
 * original contactedAt).
 */
const updateLeadStatus = async ({ leadId, status, statusNotes }) => {
  const lead = await PlacementLead.findById(leadId);
  if (!lead) throw ApiError.notFound('Lead not found');

  lead.status = status;
  if (statusNotes !== undefined) lead.statusNotes = statusNotes;

  if (status === 'contacted' && !lead.contactedAt) lead.contactedAt = new Date();
  if (status === 'enrolled' && !lead.enrolledAt) lead.enrolledAt = new Date();

  await lead.save();
  return lead;
};

module.exports = {
  checkEligibility,
  getOrCreateLead,
  listLeads,
  updateLeadStatus,
};
