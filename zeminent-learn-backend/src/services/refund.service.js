'use strict';

const Payment = require('../models/payment.model');
const PlacementEnrollment = require('../models/placementEnrollment.model');
const razorpayService = require('./razorpay.service');
const ApiError = require('../utils/ApiError');

// Slice 14 B.4: admin-initiated refund flow. The money side lives on
// Payment.refund + paymentStatus; the lifecycle side lives on
// PlacementEnrollment.status/refundedAt. Both sides update in this one
// service so a partial-success leaving Payment.refunded but Enrollment.active
// is impossible by the time the controller returns.
//
// Razorpay is the source of truth for "did the money actually move." We pass
// Payment._id as the Idempotency-Key — Razorpay dedupes refunds against
// that key for ~24h, so a network retry or a panicked admin double-click
// can't trigger two refunds.

/**
 * @param {object} args
 * @param {string} args.paymentId  Mongo _id of the Payment to refund
 * @param {string} args.adminUserId Mongo _id of the admin initiating the refund
 * @param {string} [args.reason]    free-text reason (stored on Payment + Enrollment)
 * @param {string} [args.notes]     internal admin notes (Payment only)
 */
const initiateRefund = async ({ paymentId, adminUserId, reason, notes }) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Payment not found');

  // Conflict checks fire BEFORE the status gate so the more specific 409
  // ("already refunded") wins over the generic 400 ("status is refunded").
  // A 'refunded' payment necessarily has refund.refundId set — both checks
  // are belt-and-braces, but they produce semantically clearer errors than
  // a single status check would.
  if (payment.refund?.refundId) {
    throw ApiError.conflict('Refund already initiated for this payment');
  }
  if (payment.paymentStatus === 'refunded') {
    throw ApiError.conflict('Payment already fully refunded');
  }
  if (
    payment.paymentStatus !== 'paid' &&
    payment.paymentStatus !== 'partially_refunded'
  ) {
    throw ApiError.badRequest(
      `Cannot refund payment with status '${payment.paymentStatus}'`,
    );
  }

  // For placement enrollment, gate on lifecycle + window. Full Access has
  // no enrollment doc, so it skips straight to the Razorpay call.
  let enrollment = null;
  if (payment.productType === 'placement_program') {
    enrollment = await PlacementEnrollment.findOne({ paymentId: payment._id });
    if (!enrollment) {
      throw ApiError.notFound('Placement enrollment not found for this payment');
    }
    if (enrollment.status === 'placed') {
      throw ApiError.badRequest(
        'Cannot refund a placed candidate. Status must not be "placed".',
      );
    }
    if (enrollment.status === 'refunded') {
      throw ApiError.conflict('Enrollment already refunded');
    }
    if (new Date() > enrollment.refundEligibleUntil) {
      throw ApiError.badRequest(
        `Refund window expired. Eligible until: ${enrollment.refundEligibleUntil.toISOString()}`,
      );
    }
  }

  // Razorpay refund. Idempotency-Key = Payment._id — see file header.
  const amountPaise = payment.amount * 100;
  let rpRefund;
  try {
    rpRefund = await razorpayService.refundPayment({
      razorpayPaymentId: payment.razorpayPaymentId,
      amount: amountPaise,
      notes: {
        productType: payment.productType,
        invoiceNumber: payment.invoiceNumber || '',
        reason: reason || '',
      },
      idempotencyKey: String(payment._id),
    });
  } catch (err) {
    // Wrap to 502 — the upstream returned an error, our request was valid.
    // Razorpay errors come back as { error: { description, code, ... } }.
    throw new ApiError(
      502,
      `Razorpay refund failed: ${err.error?.description || err.message}`,
    );
  }

  // Payment side. Note: invoice-locked fields hook in payment.model.js
  // intentionally does NOT lock paymentStatus or refund.* — refund is the
  // one post-issuance mutation that's allowed.
  payment.refund = {
    refundId: rpRefund.id,
    amount: payment.amount,
    refundedAt: new Date(),
    reason: reason || '',
    initiatedBy: adminUserId,
    notes: notes || '',
  };
  payment.paymentStatus = 'refunded';
  await payment.save();

  // Enrollment side. Only for placement_program — full_access has no doc.
  if (enrollment) {
    enrollment.status = 'refunded';
    enrollment.refundedAt = new Date();
    enrollment.refundReason = reason || '';
    await enrollment.save();
  }

  return { payment, enrollment, refund: rpRefund };
};

module.exports = { initiateRefund };
