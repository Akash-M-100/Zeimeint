'use strict';

const crypto = require('crypto');
const Razorpay = require('razorpay');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Lazily-usable singleton — only instantiated when keys are present.
let instance = null;
if (env.isRazorpayConfigured) {
  instance = new Razorpay({
    key_id: env.razorpay.keyId,
    key_secret: env.razorpay.keySecret,
  });
}

const getInstance = () => {
  if (!instance) {
    throw ApiError.badRequest('Razorpay is not configured on the server');
  }
  return instance;
};

/**
 * Creates a Razorpay order. `amount` is given in the main currency unit
 * (e.g. rupees) and converted to the smallest unit (paise) here.
 */
const createOrder = async ({ amount, currency = 'INR', receipt, notes }) => {
  return getInstance().orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt,
    notes,
  });
};

/**
 * Verifies the Razorpay payment signature. The signature is an HMAC-SHA256 of
 * `${orderId}|${paymentId}` keyed with the Razorpay secret. Compared in
 * constant time to avoid timing leaks.
 */
const verifySignature = ({ orderId, paymentId, signature }) => {
  if (!env.isRazorpayConfigured) {
    throw ApiError.badRequest('Razorpay is not configured on the server');
  }
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(String(signature || ''), 'utf8');

  return (
    expectedBuf.length === actualBuf.length &&
    crypto.timingSafeEqual(expectedBuf, actualBuf)
  );
};

// The publishable key id is safe to expose to the frontend checkout widget.
const getKeyId = () => env.razorpay.keyId;

/**
 * Slice 14 B.2: fetches a payment by id from Razorpay's API. Used as the
 * "third source of truth" for payment.method when neither the browser
 * verify callback nor the webhook delivers it — see
 * paymentService.applyPostPaymentEffects.
 *
 * Returns the raw Razorpay payment object (has `method`, `card`, `vpa`,
 * etc.). Throws on network failure or unknown id — caller should swallow.
 */
const fetchPayment = async (razorpayPaymentId) =>
  getInstance().payments.fetch(razorpayPaymentId);

/**
 * Slice 14 B.4: issues a refund (full or partial) against a captured payment.
 * `amount` is in PAISE — Razorpay's native unit — to avoid the rupee→paise
 * rounding that bit us in B.1. `idempotencyKey` is REQUIRED: Razorpay dedupes
 * refund attempts by this header for ~24h, so passing Payment._id guarantees
 * a network retry can't double-refund.
 *
 * Calls the REST endpoint directly via fetch rather than going through
 * `instance.payments.refund(...)`. The 2.9.6 SDK signature is
 * (paymentId, params, callback) with no per-request headers slot — there is
 * no way to attach Idempotency-Key through it. Going under the SDK is the
 * cleanest way to honour the dedup contract without monkey-patching.
 *
 * Throws a synthetic { error: { description, code } } on non-2xx so the
 * caller's `err.error?.description` path matches the SDK's error shape.
 */
const refundPayment = async ({
  razorpayPaymentId,
  amount,
  notes,
  idempotencyKey,
}) => {
  if (!idempotencyKey) {
    throw new Error('idempotencyKey is required for refunds');
  }
  if (!env.isRazorpayConfigured) {
    throw ApiError.badRequest('Razorpay is not configured on the server');
  }

  const url = `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`;
  const basicAuth = Buffer.from(
    `${env.razorpay.keyId}:${env.razorpay.keySecret}`,
  ).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ amount, notes: notes || {} }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.description || `Razorpay HTTP ${res.status}`);
    err.error = body?.error || { description: `HTTP ${res.status}`, code: 'UNKNOWN' };
    err.statusCode = res.status;
    throw err;
  }
  return body;
};

/**
 * Verifies a Razorpay webhook signature. The dashboard signs the **raw**
 * request body with HMAC-SHA256 keyed on the per-webhook secret and sends the
 * result as the `x-razorpay-signature` header. The caller must pass the exact
 * bytes received — whitespace normalization after JSON.parse would break this.
 * See app.js's `express.json({ verify })` callback for how the raw body is
 * captured. Returns boolean; constant-time compare.
 */
const verifyWebhookSignature = ({ rawBody, signature }) => {
  if (!env.razorpay.webhookSecret) {
    // Defensive — the controller already gates on isRazorpayWebhookConfigured.
    throw new Error('Razorpay webhook secret not configured');
  }
  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');

  // timingSafeEqual throws on length mismatch — length-check first.
  if (!signature || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex'),
  );
};

module.exports = {
  createOrder,
  verifySignature,
  getKeyId,
  fetchPayment,
  verifyWebhookSignature,
  refundPayment,
};
