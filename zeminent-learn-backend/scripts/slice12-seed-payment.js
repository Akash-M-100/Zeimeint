'use strict';

/* One-shot seeder for Slice 12 smoke tests. Inserts a captured Payment for
 * the given user (USER_ID env var) and grants them Full Access. Run via:
 *   USER_ID=<id> node scripts/slice12-seed-payment.js
 * Idempotent: skips if a captured payment already exists for the user.
 * Delete this file after testing. */

require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('../src/models/payment.model');
const User = require('../src/models/user.model');
const paymentService = require('../src/services/payment.service');
const { PACKAGE_PRICE_INR } = require('../src/config/product');

(async () => {
  const userId = process.env.USER_ID;
  if (!userId) {
    console.error('USER_ID env var required');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('connected to mongo');

  const user = await User.findById(userId);
  if (!user) {
    console.error(`user ${userId} not found`);
    process.exit(1);
  }

  // Grant full access if not already.
  await User.updateOne(
    { _id: userId, hasFullAccess: { $ne: true } },
    { $set: { hasFullAccess: true, fullAccessGrantedAt: new Date() } },
  );
  console.log(`granted full access to ${user.email}`);

  // Skip if a captured payment already exists.
  const existing = await Payment.findOne({ userId, paymentStatus: 'paid' });
  if (existing) {
    console.log(`existing captured payment: ${existing._id} (${existing.receiptNumber})`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // Insert a captured payment with full receipt metadata (mirrors what
  // the webhook path would produce).
  const payment = await Payment.create({
    userId,
    amount: PACKAGE_PRICE_INR,
    currency: 'INR',
    paymentStatus: 'paid',
    razorpayOrderId: 'order_slice12_seed_' + Date.now(),
    razorpayPaymentId: 'pay_slice12_seed_' + Date.now(),
    razorpaySignature: 'seed-no-signature',
  });
  // Receipt number is deterministic from _id, so set after the doc exists.
  payment.receiptNumber = paymentService.generateReceiptNumber(payment._id);
  payment.receiptMeta = {
    paymentMethod: 'card',
    paidAt: new Date(),
  };
  await payment.save();

  console.log(`created captured payment: ${payment._id}`);
  console.log(`receiptNumber: ${payment.receiptNumber}`);

  await mongoose.disconnect();
})();
