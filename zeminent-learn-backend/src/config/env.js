'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Fail fast if the essentials are missing — there is no safe default for these.
// OAUTH_BRIDGE_SECRET is required: the /api/auth/oauth endpoint refuses every
// request without a matching secret, and fail-secure is to refuse to boot
// when the secret is missing rather than ship a disabled OAuth flow silently.
const REQUIRED = [
  'MONGODB_URI',
  'JWT_SECRET',
  'OAUTH_BRIDGE_SECRET',
  // SMTP — the email pipeline backs verification and password reset flows.
  // Fail-secure on boot is preferable to silently shipping broken email.
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'APP_URL',
];
const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const smtpPort = parseInt(process.env.SMTP_PORT, 10);
if (!Number.isInteger(smtpPort) || smtpPort <= 0) {
  console.error(`❌ SMTP_PORT must be a positive integer (got "${process.env.SMTP_PORT}")`);
  process.exit(1);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,

  mongoUri: process.env.MONGODB_URI,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Supports a single origin or a comma-separated list.
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  admin: {
    name: process.env.ADMIN_NAME || 'LMS Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@lms.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'admin123',
    // Shared secret required to hit POST /api/auth/admin/register.
    // Leaving this unset disables the endpoint entirely (returns 503).
    registerSecret: process.env.ADMIN_REGISTER_SECRET || '',
  },

  oauth: {
    // Shared secret between the Next.js OAuth Route Handler and this API.
    // Frontend sends it as the `X-Bridge-Secret` header on /api/auth/oauth.
    // Required at boot — see the REQUIRED list above.
    bridgeSecret: process.env.OAUTH_BRIDGE_SECRET,
  },

  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    videoBucket: process.env.AWS_S3_VIDEO_BUCKET,
    cloudfront: {
      domain: process.env.AWS_CLOUDFRONT_DOMAIN,
      keyPairId: process.env.AWS_CLOUDFRONT_KEY_PAIR_ID,
      privateKeyPath: process.env.AWS_CLOUDFRONT_PRIVATE_KEY_PATH,
      // privateKey (PEM contents) is loaded from privateKeyPath below.
      privateKey: null,
    },
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    // Optional: enables the /api/payments/webhook endpoint. Without it the
    // webhook returns 503 and we fall back to client-side verify only.
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  mail: {
    host: process.env.SMTP_HOST,
    port: smtpPort,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
    appUrl: process.env.APP_URL,
  },
};

// These integrations are optional at boot — the server still runs without them,
// but the related endpoints respond with a clear "not configured" error.

// S3 backs lecture video + course thumbnail storage. Without it, the presign
// and thumbnail-upload endpoints return a clear "not configured" error.
env.isS3Configured = Boolean(
  env.aws.region && env.aws.accessKeyId && env.aws.secretAccessKey && env.aws.videoBucket,
);

// CloudFront is preferred for signing playback URLs. Loading the private key is
// what unlocks signing — try to read it from disk once at boot. When it (or the
// other CloudFront settings) is missing, s3.service falls back to S3 presigned
// GET URLs, so playback still works with only the S3 credentials above.
if (env.aws.cloudfront.privateKeyPath) {
  try {
    env.aws.cloudfront.privateKey = fs.readFileSync(
      path.resolve(env.aws.cloudfront.privateKeyPath),
      'utf8',
    );
  } catch {
    env.aws.cloudfront.privateKey = null;
  }
}
env.isCloudFrontConfigured = Boolean(
  env.aws.cloudfront.domain && env.aws.cloudfront.keyPairId && env.aws.cloudfront.privateKey,
);

env.isRazorpayConfigured = Boolean(env.razorpay.keyId && env.razorpay.keySecret);
env.isRazorpayWebhookConfigured = Boolean(env.razorpay.webhookSecret);

if (!env.isS3Configured) {
  console.warn('⚠️  AWS S3 not configured — video upload + thumbnail endpoints are disabled.');
} else if (!env.isCloudFrontConfigured) {
  console.warn('⚠️  CloudFront not configured — falling back to S3 presigned URLs for playback.');
}
if (!env.isRazorpayConfigured) {
  console.warn('⚠️  Razorpay not configured — payment endpoints are disabled.');
}

// Production-only warnings (non-fatal): these vars aren't in REQUIRED because
// the API can still boot and serve non-payment surface without them, but a
// production deploy without them will silently disable payments and the
// webhook reconciliation path — flag it loudly.
if (env.nodeEnv === 'production') {
  const missingRazorpay = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].filter(
    (k) => !process.env[k],
  );
  if (missingRazorpay.length) {
    console.warn(
      `⚠️  PRODUCTION WARNING: Razorpay env vars missing: ${missingRazorpay.join(', ')}. ` +
        'Payments will fail with "Razorpay is not configured". Set these on the VPS.',
    );
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn(
      '⚠️  PRODUCTION WARNING: RAZORPAY_WEBHOOK_SECRET missing. ' +
        'Webhook endpoint returns 503; closed-tab payments will not be reconciled automatically.',
    );
  }
}

module.exports = env;
