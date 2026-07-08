'use strict';

const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const Payment = require('../models/payment.model');
const paymentService = require('../services/payment.service');
const razorpayService = require('../services/razorpay.service');
const invoiceService = require('../services/invoice.service');
const s3Service = require('../services/s3.service');

const VALID_PRODUCT_TYPES = ['full_access', 'placement_program'];

// POST /api/payments/create-order — start a SKU-aware purchase (auth required).
// Body: { productType, billingAddress, buyerGSTIN?, termsAccepted? }
// termsAccepted is required for placement_program; ignored otherwise.
const createOrder = asyncHandler(async (req, res) => {
  const { productType, billingAddress, buyerGSTIN, termsAccepted } = req.body;

  if (!VALID_PRODUCT_TYPES.includes(productType)) {
    throw ApiError.badRequest('Invalid productType');
  }

  if (productType === 'placement_program') {
    if (!termsAccepted?.version || !termsAccepted?.acceptedAt) {
      throw ApiError.badRequest(
        'Terms acceptance is required for placement enrollment',
      );
    }
  }

  const result = await paymentService.createOrder({
    userId: req.user._id,
    productType,
    billingAddress,
    buyerGSTIN,
  });

  // Slice 14 B.2: persist click-to-accept attestation on the Payment so
  // applyPostPaymentEffects can copy it to the PlacementEnrollment when
  // payment is captured. IP + UA come from the request; the service
  // doesn't need to know about req.
  if (productType === 'placement_program') {
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '';
    const userAgent = req.headers['user-agent'] || '';
    await Payment.updateOne(
      { _id: result.payment.id },
      {
        $set: {
          'metadata.termsAccepted.version': termsAccepted.version,
          'metadata.termsAccepted.acceptedAt': new Date(termsAccepted.acceptedAt),
          'metadata.termsAccepted.ipAddress': ipAddress,
          'metadata.termsAccepted.userAgent': userAgent,
        },
      },
    );
  }

  res.status(201).json(new ApiResponse(201, 'Order created', result));
});

// POST /api/payments/verify — verify signature and apply post-payment effects.
const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.verifyPayment(req.user._id, req.body);
  res
    .status(200)
    .json(new ApiResponse(200, 'Payment verified', { payment }));
});

// GET /api/payments/history — current user's purchase history (requires auth).
const getHistory = asyncHandler(async (req, res) => {
  const payments = await paymentService.getHistory(req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, 'Payment history fetched', { payments }));
});

// POST /api/payments/webhook — Razorpay server-to-server. NO user auth: the
// caller is Razorpay, authentication is via HMAC signature on the raw body.
// IMPORTANT: this handler is intentionally NOT wrapped in asyncHandler. We
// catch our own errors and always return 200 to Razorpay (except for
// configuration/signature problems) so internal bugs don't trigger Razorpay's
// retry storm.
const handleWebhook = async (req, res) => {
  try {
    if (!env.isRazorpayWebhookConfigured) {
      return res.status(503).json({ error: 'webhook_not_configured' });
    }

    // app.js's `express.json({ verify })` callback captures the raw Buffer on
    // this exact path. If it's missing, body parsing didn't run as expected —
    // refuse rather than guess.
    const rawBody = req.rawBody;
    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ error: 'raw_body_missing' });
    }

    const signature = req.headers['x-razorpay-signature'];
    const rawString = rawBody.toString('utf8');
    const valid = razorpayService.verifyWebhookSignature({
      rawBody: rawString,
      signature,
    });
    if (!valid) {
      console.warn(
        '💳 Webhook signature mismatch (sig prefix:',
        signature?.slice(0, 8) + '...)',
      );
      return res.status(400).json({ error: 'invalid_signature' });
    }

    const event = JSON.parse(rawString);
    const entity = event?.payload?.payment?.entity;
    console.log(
      `💳 Webhook received: ${event.event} (order=${entity?.order_id || 'n/a'})`,
    );

    switch (event.event) {
      case 'payment.captured':
        await paymentService.handlePaymentCaptured(entity || {});
        break;
      case 'payment.failed':
        await paymentService.handlePaymentFailed(entity || {});
        break;
      default:
        console.log(`💳 Unhandled webhook event type: ${event.event}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // Critical: still 200 to Razorpay so a bug here doesn't cause retry spam.
    console.error('💳 Webhook processing error:', err.message);
    if (err.stack) console.error(err.stack);
    return res.status(200).json({ received: true, error: 'internal' });
  }
};

// GET /api/payments/me — current user's captured payments, newest first.
const listMyPayments = asyncHandler(async (req, res) => {
  const payments = await paymentService.listMyCapturedPayments(req.user._id);
  res.status(200).json(new ApiResponse(200, 'Payments fetched', { payments }));
});

// GET /api/payments/receipt/:paymentId — streams the GST tax invoice PDF.
// Two paths, in order:
//   1. S3 stream when invoicePdfS3Key is set (the immutable artifact
//      uploaded on the first paid transition).
//   2. Live regeneration via invoice.service when S3 is missing or fetch
//      fails — safety net for the brief window between invoice number
//      allocation and S3 upload, and for environments without S3.
// 404 on not-yours / malformed id (anti-enumeration; never 403/400 so
// attackers can't probe id format vs ownership).
const downloadReceipt = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  if (!mongoose.isValidObjectId(paymentId)) {
    throw ApiError.notFound('Receipt not found');
  }

  const payment = await paymentService.findOwnedPaidPayment(
    req.user._id,
    paymentId,
  );
  if (!payment) throw ApiError.notFound('Receipt not found');

  // Prefer invoiceNumber (B.3) for filename; fall back to legacy
  // receiptNumber (B.2 and earlier) for any pre-B.3 payments.
  const baseName = (payment.invoiceNumber || payment.receiptNumber || String(payment._id)).replace(/\//g, '-');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${baseName}.pdf"`);

  // Path A: stream straight from S3 — no buffering, no regen cost.
  if (payment.invoicePdfS3Key) {
    try {
      const stream = await s3Service.getObjectStream(payment.invoicePdfS3Key);
      stream.pipe(res);
      return;
    } catch (err) {
      console.warn(
        `🧾 S3 fetch failed for invoice ${payment.invoiceNumber}, falling back to regen:`,
        err.message,
      );
    }
  }

  // Path B: regenerate. Used when S3 upload hadn't happened yet (race
  // between invoice issuance and S3 upload) or when S3 returned an error.
  const buffer = await invoiceService.generateInvoiceBuffer(payment);
  res.send(buffer);
});

module.exports = {
  createOrder,
  verifyPayment,
  getHistory,
  handleWebhook,
  listMyPayments,
  downloadReceipt,
};
