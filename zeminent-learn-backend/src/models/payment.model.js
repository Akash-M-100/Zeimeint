'use strict';

const mongoose = require('mongoose');

// Slice 14 B.1: extended with 'refunded' + 'partially_refunded' to support
// the upcoming refund workflow. Legacy ['created','paid','failed'] preserved.
const PAYMENT_STATUS = [
  'created',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
];

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      // Slice 11: optional for package purchases (no per-course context).
      // Legacy per-course payments populated it; preserved for history.
      default: null,
      index: true,
    },
    // Stored in the main currency unit (e.g. rupees), not paise.
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      default: 'created',
    },
    razorpayOrderId: {
      type: String,
      index: true,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    // Slice 12: human-readable receipt identifier (e.g. ZL-A1B2C3D4) stamped
    // once on the first paid transition. Indexed so /payments/me can sort
    // cheaply and to allow lookup-by-receipt if we ever add that endpoint.
    receiptNumber: {
      type: String,
      default: null,
      index: true,
    },
    // Captured-payment metadata for the receipt PDF. `paidAt` is set on the
    // first paid transition; `paymentMethod` is best-effort — verify-path
    // sets it to null because Razorpay doesn't send the method on the
    // verify callback, and the webhook (which does) fills it in later.
    receiptMeta: {
      paymentMethod: { type: String, default: null },
      paidAt: { type: Date, default: null },
    },

    // ─── Slice 14 B.1: product identifier ────────────────────────────────
    // Lets a single Payment collection cover Full Access AND the Placement
    // Program (and any future SKU) without bifurcating storage. Required so
    // new orders can't accidentally land without a known product.
    productType: {
      type: String,
      enum: ['full_access', 'placement_program'],
      default: 'full_access',
      required: true,
      index: true,
    },

    // ─── Slice 14 B.1: GST breakdown (inclusive pricing) ─────────────────
    // `amount` remains the customer-facing total. Invariant:
    //   tax.taxableValue + tax.totalTax === amount
    // For intra-state: cgst === sgst === totalTax/2 (with off-by-1 absorbed
    // by sgst). For inter-state: igst === totalTax, cgst === sgst === 0.
    tax: {
      taxableValue: { type: Number, required: true, min: 0, default: 0 },
      rate: { type: Number, default: 18 }, // percent
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      totalTax: { type: Number, required: true, min: 0, default: 0 },
    },

    // ─── Slice 14 B.1: billing address (collected at checkout) ───────────
    // Required on a GST tax invoice. State + stateCode drive intra/inter
    // determination — without stateCode we can't pick CGST+SGST vs IGST.
    billingAddress: {
      name: { type: String, default: '' },
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' }, // full state name
      stateCode: { type: String, default: '' }, // 2-digit GST code
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    // Optional B2B: when set, invoice is treated as a B2B tax invoice.
    buyerGSTIN: { type: String, default: null },

    // ─── Slice 14 B.1: tax-invoice fields ────────────────────────────────
    // `receiptNumber` above is a SHA-prefix slug (kept for backwards compat).
    // `invoiceNumber` is the GST-compliant sequential, FY-prefixed identifier
    // assigned via Counter on the first paid transition. unique+sparse so
    // unpaid/abandoned Payments don't collide on a null value.
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // SAC 999293 = Online educational services. Override per product via
    // config/product.js getProduct(sku).hsnSacCode.
    hsnSacCode: { type: String, default: '999293' },
    // Buyer's state code at time of invoice — frozen for audit trail.
    placeOfSupply: { type: String, default: '' },
    invoiceIssuedAt: { type: Date, default: null },
    // S3 key of the immutable invoice PDF, uploaded once on the paid
    // transition. Regenerating later (e.g. for re-email) should fetch this
    // S3 object, NOT re-render — the rendered output is the audit artifact.
    invoicePdfS3Key: { type: String, default: null },

    // ─── Slice 14 B.1: refund tracking ───────────────────────────────────
    // Cross-references Razorpay's refund_id. `amount` here is the amount
    // refunded (partial refunds supported via `partially_refunded` status).
    refund: {
      refundId: { type: String, default: null },
      amount: { type: Number, default: 0 },
      refundedAt: { type: Date, default: null },
      reason: { type: String, default: '' },
      initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      notes: { type: String, default: '' },
    },

    // ─── Slice 14 B.2: terms-acceptance metadata ────────────────────────
    // Captured at order-creation time (BEFORE Razorpay confirms the
    // payment) so we have a record of the exact terms the user agreed to
    // even if they abandon checkout. On the first paid transition,
    // applyPostPaymentEffects copies this snapshot to the new
    // PlacementEnrollment doc — single source of truth for "what did the
    // user click-accept and when?".
    //
    // Optional on the Payment schema (Full Access orders don't need it)
    // but enforced as required by the controller for placement_program.
    metadata: {
      termsAccepted: {
        version: { type: String, default: null },
        acceptedAt: { type: Date, default: null },
        ipAddress: { type: String, default: null },
        userAgent: { type: String, default: null },
      },
    },
  },
  { timestamps: true }, // adds createdAt + updatedAt
);

// ─── Slice 14 B.3: invoice-locked-fields immutability hook ──────────────
// Once a tax invoice has been issued (invoiceNumber populated in the DB),
// the fields that compose that invoice freeze. Any later .save() that
// touches one of them throws — the immutable PDF in S3 must match the
// Mongo state forever for audit trail integrity.
//
// Gate logic: the issuance save itself transitions invoiceNumber from
// null → 'ZL/...', which trips isModified('invoiceNumber'). Allow that
// case through by gating on `!isModified('invoiceNumber') && invoiceNumber`
// — i.e. "the invoice was already in the DB before this save started."
//
// Mutable post-issuance fields (intentionally NOT in the lock list):
//   - paymentStatus (refund flow flips paid → refunded)
//   - refund.*       (refund flow populates it)
//   - invoicePdfS3Key (retry-uploadable if first upload failed)
//   - receiptMeta.* (paymentMethod can be backfilled via webhook later)
const INVOICE_LOCKED_PATHS = [
  'productType',
  'amount',
  'currency',
  'tax.taxableValue',
  'tax.rate',
  'tax.cgst',
  'tax.sgst',
  'tax.igst',
  'tax.totalTax',
  'billingAddress.name',
  'billingAddress.line1',
  'billingAddress.line2',
  'billingAddress.city',
  'billingAddress.state',
  'billingAddress.stateCode',
  'billingAddress.pincode',
  'billingAddress.country',
  'buyerGSTIN',
  'hsnSacCode',
  'placeOfSupply',
  'invoiceNumber',
  'invoiceIssuedAt',
];

paymentSchema.pre('save', function invoiceImmutability(next) {
  const wasIssued =
    !this.isModified('invoiceNumber') && Boolean(this.invoiceNumber);
  if (!wasIssued) return next();

  const modifiedLocked = INVOICE_LOCKED_PATHS.filter((p) => this.isModified(p));
  if (modifiedLocked.length) {
    return next(
      new Error(
        `Cannot modify invoice-locked fields after invoice issued: ${modifiedLocked.join(', ')}`,
      ),
    );
  }
  next();
});

paymentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

paymentSchema.statics.STATUS = PAYMENT_STATUS;

module.exports = mongoose.model('Payment', paymentSchema);
