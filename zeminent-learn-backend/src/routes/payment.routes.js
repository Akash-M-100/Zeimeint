'use strict';

const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createOrderValidator,
  verifyPaymentValidator,
} = require('../validators/payment.validator');

const router = express.Router();

// Razorpay webhook (server-to-server). Public — auth is via HMAC signature
// on the raw body in the handler. Mounted BEFORE `router.use(protect)` so it
// stays unauthenticated. Raw body is captured in app.js's express.json verify
// callback (see comment there).
router.post('/webhook', paymentController.handleWebhook);

// Every other payment route requires an authenticated user.
router.use(protect);

router.post('/create-order', createOrderValidator, validate, paymentController.createOrder);
router.post('/verify', verifyPaymentValidator, validate, paymentController.verifyPayment);
router.get('/history', paymentController.getHistory);

// Slice 12: receipts. /me returns the user's captured-payment list (for the
// Profile receipts UI); /receipt/:paymentId streams the PDF for one of them.
router.get('/me', paymentController.listMyPayments);
router.get('/receipt/:paymentId', paymentController.downloadReceipt);

module.exports = router;
