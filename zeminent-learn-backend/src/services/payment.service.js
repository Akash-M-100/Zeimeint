'use strict';

const crypto = require('crypto');
const Payment = require('../models/payment.model');
const User = require('../models/user.model');
const { assignStudentToBatch } = require('./batch.service');
const ApiError = require('../utils/ApiError');
const razorpayService = require('./razorpay.service');
const {
  getProduct,
  computeInclusiveGST,
  getSellerConfig,
} = require('../config/product');

/**
 * Slice 14 B.2: SKU-aware order creation. Replaces the Slice 11 single-SKU
 * createOrder. Computes GST breakdown server-side (so the Razorpay order
 * amount and the Payment.tax breakdown are guaranteed consistent) and
 * persists the full billingAddress snapshot for the tax invoice.
 *
 * Eligibility is product-specific:
 *  - full_access:     reject if user already has hasFullAccess
 *  - placement_program: must pass progress-based eligibility AND have no
 *                       active enrollment
 *
 * Terms-acceptance metadata is NOT taken here (the controller patches it
 * onto the Payment after this returns) so the service doesn't need to
 * know about req.headers / req.ip.
 */
const createOrder = async ({
  userId,
  productType,
  billingAddress,
  buyerGSTIN,
}) => {
  const product = getProduct(productType); // throws on unknown SKU

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (productType === 'full_access') {
    if (user.hasFullAccessNow()) {
      throw ApiError.conflict('You already have Full Access');
    }
  } else if (productType === 'placement_program') {
    // Lazy require to avoid circular deps with placement.service.
    const placementService = require('./placement.service');
    const PlacementEnrollment = require('../models/placementEnrollment.model');

    const eligibility = await placementService.checkEligibility(userId);
    if (!eligibility.eligible) throw ApiError.forbidden(eligibility.reason);

    const existingEnrollment = await PlacementEnrollment.findOne({
      userId,
      status: { $in: ['active', 'placement_in_progress', 'placed'] },
    });
    if (existingEnrollment) {
      throw ApiError.conflict(
        'You already have an active placement enrollment',
      );
    }
  }

  // Billing address must include a valid 2-digit GST state code so the
  // intra/inter-state CGST/SGST vs IGST split is determinate.
  if (!billingAddress?.stateCode || !/^\d{2}$/.test(billingAddress.stateCode)) {
    throw ApiError.badRequest(
      'Valid 2-digit stateCode required in billingAddress',
    );
  }

  const sellerConfig = getSellerConfig();
  const totalAmount = product.priceINR;
  const taxBreakdown = computeInclusiveGST({
    totalAmount,
    rate: product.gstRate,
    sellerStateCode: sellerConfig.stateCode,
    buyerStateCode: billingAddress.stateCode,
  });

  // Razorpay's receipt field has a 40-char limit. SHA-256 prefix of
  // userId+productType+timestamp keeps it deterministic per attempt and
  // well under that limit.
  const receiptSlug = crypto
    .createHash('sha256')
    .update(`${userId}-${productType}-${Date.now()}`)
    .digest('hex')
    .slice(0, 30);

  const order = await razorpayService.createOrder({
    amount: totalAmount,
    currency: 'INR',
    receipt: receiptSlug,
    notes: {
      userId: String(userId),
      productType,
      buyerStateCode: billingAddress.stateCode,
    },
  });

  const payment = await Payment.create({
    userId,
    productType,
    amount: totalAmount,
    currency: 'INR',
    paymentStatus: 'created',
    razorpayOrderId: order.id,
    tax: taxBreakdown,
    billingAddress,
    buyerGSTIN: buyerGSTIN || null,
    placeOfSupply: billingAddress.stateCode,
    hsnSacCode: product.hsnSacCode,
    receiptNumber: `ZL-${receiptSlug.slice(0, 8).toUpperCase()}`,
  });

  return {
    keyId: razorpayService.getKeyId(),
    order,
    product: {
      sku: product.sku,
      name: product.name,
      priceINR: product.priceINR,
      tax: taxBreakdown,
    },
    payment: { id: payment._id },
  };
};

/**
 * Slice 12: human-readable receipt identifier stamped on the first paid
 * transition. Deterministic from the Payment._id so a retried receipt
 * generation produces the same number. Uppercased for the customary
 * receipt-number look.
 *
 * Note: from B.1, the Slice 11 `createOrder` is gone and the receipt slug
 * is now derived from the Razorpay receipt slug. This helper survives only
 * as the legacy fallback in payment paths that predate receiptNumber being
 * stamped at create time.
 */
const generateReceiptNumber = (paymentId) =>
  `ZL-${String(paymentId).slice(0, 8).toUpperCase()}`;

/**
 * Slice 14 B.2: idempotent post-payment effects, called by BOTH:
 *  - verifyPayment (synchronous from the browser)
 *  - handlePaymentCaptured (asynchronous from the webhook)
 *
 * Two responsibilities:
 *
 *   1. Backfill receiptMeta.paymentMethod from Razorpay's API. The verify
 *      callback never carries `method`; the webhook does, but it might
 *      not fire (e.g. dev env with no webhook secret). Fetching from the
 *      Razorpay API is the third source of truth.
 *
 *   2. Apply the productType-aware side effect:
 *      - full_access  → set User.hasFullAccess (monotonic via $ne guard)
 *      - placement_program → create PlacementEnrollment + close out lead
 *
 * Safe to call multiple times; each effect short-circuits on no-op.
 */
const applyPostPaymentEffects = async (payment) => {
  // 1. paymentMethod backfill — only attempt if we don't have it AND we
  //    have a razorpayPaymentId to look up.
  if (
    !payment.receiptMeta?.paymentMethod &&
    payment.razorpayPaymentId
  ) {
    try {
      const rp = await razorpayService.fetchPayment(payment.razorpayPaymentId);
      if (rp?.method) {
        payment.receiptMeta = payment.receiptMeta || {};
        payment.receiptMeta.paymentMethod = rp.method;
        await payment.save();
      }
    } catch (err) {
      // Logged but never thrown — paymentMethod stays null if Razorpay's
      // API is down. Downstream consumers (PDF receipt) handle null.
      console.warn(
        `💳 razorpayService.fetchPayment failed for ${payment.razorpayPaymentId}:`,
        err.message,
      );
    }
  }

  // 2. Productype-aware grant (full_access OR placement_program).
  //    Restructured to if/else if so both branches fall through into the
  //    Slice 14 B.3 invoice-issuance block below.
 if (payment.productType === 'full_access') {
  await User.updateOne(
    {
      _id: payment.userId,
      hasFullAccess: { $ne: true },
    },
    {
      $set: {
        hasFullAccess: true,
        fullAccessGrantedAt: new Date(),
      },
    },
  );

  try {
    await assignStudentToBatch(payment.userId);
  } catch (err) {
    console.error(
      `Batch assignment failed for user ${payment.userId}:`,
      err.message,
    );
  }

} else if (payment.productType === 'placement_program') {
    // Lazy requires to avoid circular dependencies.
    const PlacementEnrollment = require('../models/placementEnrollment.model');
    const PlacementLead = require('../models/placementLead.model');

    // Idempotent at the data layer: paymentId is unique on Enrollment.
    // We pre-check anyway so a duplicate call doesn't even attempt the
    // create (cleaner logs).
    const existing = await PlacementEnrollment.findOne({
      paymentId: payment._id,
    });
    if (!existing) {
      const termsAccepted = payment.metadata?.termsAccepted;
      if (!termsAccepted?.version || !termsAccepted?.acceptedAt) {
        // Defensive: the controller requires terms before order creation,
        // so this should be unreachable. If it happens, escalate as a 500
        // rather than create an enrollment with missing legal attestation.
        throw new ApiError(
          500,
          `Placement payment ${payment._id} missing termsAccepted metadata`,
        );
      }

      const product = getProduct('placement_program');
      const enrolledAt = new Date();
      const refundEligibleUntil = new Date(
        enrolledAt.getTime() +
          product.refundWindowMonths * 30 * 24 * 60 * 60 * 1000,
      );

      // Back-reference any pre-payment lead so sales context follows the user.
      const lead = await PlacementLead.findOne({ userId: payment.userId });

      await PlacementEnrollment.create({
        userId: payment.userId,
        paymentId: payment._id,
        placementLeadId: lead?._id || null,
        enrolledAt,
        termsAccepted: {
          version: termsAccepted.version,
          acceptedAt: termsAccepted.acceptedAt,
          ipAddress: termsAccepted.ipAddress || '',
          userAgent: termsAccepted.userAgent || '',
        },
        refundEligibleUntil,
        status: 'active',
      });

      if (lead && lead.status !== 'enrolled') {
        lead.status = 'enrolled';
        lead.enrolledAt = enrolledAt;
        await lead.save();
      }
    }
  }

  // 3. Slice 14 B.3: tax invoice — allocate FY-sequential number, render
  //    PDF, upload to S3 (immutable), email as attachment. Idempotent at
  //    the doc level (only runs if invoiceNumber is still unset) AND each
  //    sub-step is independently fault-tolerant: a failure in PDF gen, S3
  //    upload, or email never undoes the invoice number allocation, and
  //    the receipt-download endpoint regenerates on the fly when needed.
  if (!payment.invoiceNumber) {
    const {
      getNextInvoiceNumber,
    } = require('./invoiceNumber.service');
    const { generateInvoiceBuffer } = require('./invoice.service');
    const s3Service = require('./s3.service');
    const emailService = require('./email.service');

    // Allocate number first + persist — atomic Counter $inc means the
    // sequence is safe under concurrent paid transitions. We save BEFORE
    // PDF render so even if render/upload fail the number is locked in
    // and won't be reused.
    const invoiceNumber = await getNextInvoiceNumber();
    payment.invoiceNumber = invoiceNumber;
    payment.invoiceIssuedAt = new Date();
    await payment.save();

    let pdfBuffer;
    try {
      pdfBuffer = await generateInvoiceBuffer(payment);
    } catch (err) {
      console.error(
        `🧾 invoice PDF generation failed for ${invoiceNumber}:`,
        err.message,
      );
      return; // user can re-download to regenerate
    }

    // S3 upload: key is keyed by invoice number for human-readable lookup
    // (no UUID prefix). Slashes flattened to dashes for S3 key + filename
    // compatibility.
    const s3Key = `invoices/${invoiceNumber.replace(/\//g, '-')}.pdf`;
    try {
      await s3Service.uploadBuffer({
        key: s3Key,
        buffer: pdfBuffer,
        contentType: 'application/pdf',
      });
      payment.invoicePdfS3Key = s3Key;
      await payment.save();
    } catch (err) {
      console.error(
        `🧾 invoice S3 upload failed for ${invoiceNumber}:`,
        err.message,
      );
      // Carry on — PDF is still in memory, try email; user can re-download.
    }

    // Fire-and-forget email with the PDF attached. Failure is logged but
    // never thrown — the invoice is already issued and downloadable.
    try {
      const user = await User.findById(payment.userId);
      if (user) {
        const product = getProduct(payment.productType);
        await emailService.sendInvoice({
          to: user.email,
          name: user.name,
          invoiceNumber,
          pdfBuffer,
          productName: product.name,
          amount: payment.amount,
        });
      }
    } catch (err) {
      console.error(
        `🧾 invoice email send failed for ${invoiceNumber}:`,
        err.message,
      );
    }
  }
};

/**
 * Verifies a Razorpay payment signature. On success the Payment is marked
 * `paid` and applyPostPaymentEffects runs (paymentMethod backfill + the
 * productType-aware grant). On a bad signature the Payment is marked
 * `failed` and a 400 is thrown.
 */
const verifyPayment = async (userId, payload) => {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = payload;

  const payment = await Payment.findOne({ razorpayOrderId: orderId, userId });
  if (!payment) throw ApiError.notFound('Payment record not found');
  if (payment.paymentStatus === 'paid') {
    throw ApiError.conflict('This payment has already been verified');
  }

  const isValid = razorpayService.verifySignature({
    orderId,
    paymentId,
    signature,
  });

  if (!isValid) {
    payment.paymentStatus = 'failed';
    await payment.save();
    throw ApiError.badRequest('Payment verification failed — invalid signature');
  }

  payment.paymentStatus = 'paid';
  payment.razorpayPaymentId = paymentId;
  payment.razorpaySignature = signature;
  // Stamp paidAt on the first paid transition. receiptNumber was already
  // set at order creation in B.2, so no need to derive it here.
  if (!payment.receiptMeta?.paidAt) {
    payment.receiptMeta = payment.receiptMeta || {};
    payment.receiptMeta.paidAt = new Date();
  }
  await payment.save();

  await applyPostPaymentEffects(payment);

  return payment;
};

/** Returns a user's payment history, newest first. */
const getHistory = async (userId) =>
  Payment.find({ userId })
    .populate('courseId', 'title thumbnailKey price category')
    .sort({ createdAt: -1 });

/**
 * Webhook handler for `payment.captured` — the authoritative server-to-
 * server confirmation that Razorpay actually received money. Idempotent:
 * a duplicate event (or one that races with /verify) re-runs the
 * applyPostPaymentEffects helper (which is itself idempotent) so any
 * fields the verify-path couldn't fill in (e.g. paymentMethod) still get
 * backfilled. Never throws — unknown orders are logged and swallowed so
 * Razorpay isn't sent into retry storms.
 *
 * `razorpayPayment` is event.payload.payment.entity from the webhook body
 * (Razorpay's "payment" object: { id, order_id, amount, currency, status,
 * method, ... }).
 */
const handlePaymentCaptured = async (razorpayPayment) => {
  const orderId = razorpayPayment?.order_id;
  if (!orderId) {
    console.warn('💳 Webhook payment.captured missing order_id — skipping');
    return;
  }

  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) {
    console.warn(
      `💳 Webhook payment.captured for unknown order ${orderId} — skipping`,
    );
    return;
  }

  if (payment.paymentStatus === 'paid') {
    // Already processed by /verify (or a duplicate webhook delivery).
    // Re-run applyPostPaymentEffects to catch the paymentMethod backfill
    // the verify path couldn't see. Internal idempotency guards prevent
    // double-grants or duplicate enrollments.
    if (
      razorpayPayment.method &&
      !payment.receiptMeta?.paymentMethod
    ) {
      payment.receiptMeta = payment.receiptMeta || {};
      payment.receiptMeta.paymentMethod = razorpayPayment.method;
      await payment.save();
      console.log(
        `💳 Webhook enriched paymentMethod=${razorpayPayment.method} for order ${orderId}`,
      );
    }
    await applyPostPaymentEffects(payment);
    return;
  }

  payment.paymentStatus = 'paid';
  payment.razorpayPaymentId = razorpayPayment.id || payment.razorpayPaymentId;
  if (!payment.receiptMeta?.paidAt) {
    payment.receiptMeta = payment.receiptMeta || {};
    payment.receiptMeta.paidAt = new Date();
  }
  // Webhook entity carries the payment method directly — populate before save.
  if (razorpayPayment.method && !payment.receiptMeta.paymentMethod) {
    payment.receiptMeta.paymentMethod = razorpayPayment.method;
  }
  await payment.save();

  await applyPostPaymentEffects(payment);

  console.log(
    `[payment] webhook applied for ${payment.productType} payment ${payment._id}`,
  );
};

/**
 * Webhook handler for `payment.failed`. Records the failure unless the
 * order was already paid (out-of-order events: a late failed event after
 * a successful capture must NOT downgrade the record). Never throws.
 */
const handlePaymentFailed = async (razorpayPayment) => {
  const orderId = razorpayPayment?.order_id;
  if (!orderId) {
    console.warn('💳 Webhook payment.failed missing order_id — skipping');
    return;
  }

  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) {
    console.warn(
      `💳 Webhook payment.failed for unknown order ${orderId} — skipping`,
    );
    return;
  }
  if (payment.paymentStatus === 'paid') {
    console.warn(
      `💳 Webhook payment.failed for already-paid order ${orderId} — ignoring`,
    );
    return;
  }

  payment.paymentStatus = 'failed';
  payment.razorpayPaymentId = razorpayPayment.id || payment.razorpayPaymentId;
  await payment.save();
  console.log(`💳 Webhook recorded failed payment for order ${orderId}`);
};

/**
 * Slice 12: returns this user's captured (paid) payments, newest first,
 * projecting only the fields the receipts UI needs.
 */
const listMyCapturedPayments = async (userId) =>
  Payment.find({ userId, paymentStatus: 'paid' })
    .sort({ 'receiptMeta.paidAt': -1, createdAt: -1 })
    .select(
      'receiptNumber amount currency receiptMeta razorpayPaymentId createdAt productType',
    )
    .lean();

/**
 * Slice 12: scopes a payment lookup to its owner so /receipt/:paymentId
 * can't be used to enumerate other users' receipts.
 */
const findOwnedPaidPayment = async (userId, paymentId) =>
  Payment.findOne({ _id: paymentId, userId, paymentStatus: 'paid' });

module.exports = {
  createOrder,
  generateReceiptNumber,
  verifyPayment,
  getHistory,
  handlePaymentCaptured,
  handlePaymentFailed,
  listMyCapturedPayments,
  findOwnedPaidPayment,
  applyPostPaymentEffects,
};
