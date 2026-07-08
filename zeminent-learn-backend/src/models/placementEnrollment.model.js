'use strict';

const mongoose = require('mongoose');

// Slice 14 B.1: created on successful Placement Program payment. Distinct
// from PlacementLead (which is sales-funnel context) — an Enrollment is a
// binding commitment with a signed agreement, terms-accepted attestation,
// and a refund-eligibility window.

const ENROLLMENT_STATUS = [
  'active',
  'placement_in_progress',
  'placed',
  'refund_requested',
  'refunded',
  'completed',
];

const placementEnrollmentSchema = new mongoose.Schema(
  {
    // Indexed via the explicit partialFilterExpression below rather than
    // `index: true` here — the partial index covers the only hot query
    // pattern (does this user have an active-ish enrollment?) and the
    // duplicate declaration would emit a Mongoose warning at boot.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The Payment that created this enrollment. Unique so one Payment
    // can never spawn two Enrollments (idempotency at the data layer).
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      unique: true,
    },
    // Optional back-reference to the lead. Direct enrollments (without a
    // prior lead) leave this null.
    placementLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementLead',
      default: null,
    },

    enrolledAt: { type: Date, required: true, default: Date.now },

    // Legally required attestation captured at click-to-accept time.
    // version pins the exact terms the user agreed to so a later change
    // to the agreement doesn't invalidate past consent.
    termsAccepted: {
      version: { type: String, required: true }, // e.g. 'v1.0-2026-06-12'
      acceptedAt: { type: Date, required: true },
      ipAddress: { type: String, required: true },
      userAgent: { type: String, default: '' },
    },

    // Derived from enrolledAt + refundWindowMonths (from product config).
    // Stored explicitly so refund eligibility checks are a single field
    // comparison rather than a date-math derivation on every read.
    refundEligibleUntil: { type: Date, required: true },

    status: {
      type: String,
      enum: ENROLLMENT_STATUS,
      default: 'active',
      index: true,
    },

    // Placement outcome (set when student is placed)
    placedAt: { type: Date, default: null },
    placedAtCompany: { type: String, default: '' },
    placedAtRole: { type: String, default: '' },
    placedAtSalary: { type: Number, default: null },

    // Refund outcome (cross-references Payment.refund.refundedAt — the
    // refund money flow happens on Payment; this is the enrollment-side
    // record of the lifecycle transition.)
    refundedAt: { type: Date, default: null },
    refundReason: { type: String, default: '' },

    // Free-text admin notes (sales handoff context, mentor pairing, etc.)
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

// Partial unique on userId limited to active-ish statuses: a user can have
// at most ONE active enrollment, but a refunded/completed enrollment from
// the past doesn't block a fresh sign-up.
placementEnrollmentSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['active', 'placement_in_progress', 'placed'] },
    },
  },
);

placementEnrollmentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

placementEnrollmentSchema.statics.STATUS = ENROLLMENT_STATUS;

module.exports = mongoose.model(
  'PlacementEnrollment',
  placementEnrollmentSchema,
);
