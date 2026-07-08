'use strict';

const crypto = require('crypto');
const path = require('path');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getSignedUrl: getCloudFrontSignedUrl } = require('@aws-sdk/cloudfront-signer');
const s3 = require('../config/s3');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const VIDEO_PREFIX = 'lectures';
const IMAGE_PREFIX = 'thumbnails';
const AVATAR_PREFIX = 'avatars';

// Avatar uploads are gated to image types we can confidently display. We
// don't accept SVG (XSS surface via <img>) or HEIC (browser support patchy).
const AVATAR_ALLOWED_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// How long presigned upload URLs stay valid (uploads should start promptly).
const UPLOAD_URL_TTL = 60 * 15; // 15 minutes
// How long a generated playback/thumbnail URL stays valid.
const ASSET_URL_TTL = 60 * 60 * 6; // 6 hours

const ensureConfigured = () => {
  if (!env.isS3Configured) {
    throw ApiError.badRequest('AWS S3 is not configured on the server');
  }
};

// Builds a collision-free object key under the given prefix, preserving the
// original file extension so S3/clients keep the right content type hint.
const buildKey = (prefix, filename) => {
  const ext = path.extname(filename || '').toLowerCase();
  return `${prefix}/${crypto.randomUUID()}${ext}`;
};

/**
 * Issues a presigned PUT URL so the browser can upload a video straight to S3,
 * bypassing this server. Returns the object key (persisted on the lecture) and
 * the URL the client PUTs the bytes to.
 */
const getPresignedUploadUrl = async ({ filename, contentType }) => {
  ensureConfigured();
  const key = buildKey(VIDEO_PREFIX, filename);
  const command = new PutObjectCommand({
    Bucket: env.aws.videoBucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_TTL });
  return { key, uploadUrl };
};

/**
 * Uploads an image buffer (course thumbnail) to S3 from the server and returns
 * its object key. The displayable URL is signed on read via getSignedAssetUrl.
 */
const uploadImage = async (buffer, contentType, filename) => {
  ensureConfigured();
  const key = buildKey(IMAGE_PREFIX, filename || (contentType === 'image/png' ? 'thumb.png' : 'thumb.jpg'));
  await s3.send(
    new PutObjectCommand({
      Bucket: env.aws.videoBucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return { key };
};

/**
 * Returns a time-limited URL for reading an asset (video or thumbnail).
 * Prefers a signed CloudFront URL; falls back to an S3 presigned GET URL when
 * CloudFront isn't configured. Returns null when there's no key.
 */
const getSignedAssetUrl = async (key) => {
  if (!key) return null;
  ensureConfigured();

  if (env.isCloudFrontConfigured) {
    const domain = env.aws.cloudfront.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return getCloudFrontSignedUrl({
      url: `https://${domain}/${key}`,
      keyPairId: env.aws.cloudfront.keyPairId,
      privateKey: env.aws.cloudfront.privateKey,
      dateLessThan: new Date(Date.now() + ASSET_URL_TTL * 1000).toISOString(),
    });
  }

  const command = new GetObjectCommand({ Bucket: env.aws.videoBucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: ASSET_URL_TTL });
};

/**
 * Best-effort delete of an S3 object. A failure is logged but never thrown, so
 * it can't block deletion of the owning DB record.
 */
const deleteObject = async (key) => {
  if (!env.isS3Configured || !key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: env.aws.videoBucket, Key: key }));
  } catch (err) {
    console.error(`⚠️  Failed to delete S3 object "${key}":`, err.message);
  }
};

/**
 * Slice 13: issues a presigned PUT URL for a user avatar. Mirrors the lecture
 * upload pattern but lands in the `avatars/` prefix and rejects content types
 * we don't render (no SVG, no HEIC). The browser PUTs the bytes directly to
 * S3, then PATCH /api/auth/me persists the returned `key` on the user.
 */
const getPresignedAvatarUploadUrl = async ({ contentType }) => {
  ensureConfigured();
  const ext = AVATAR_ALLOWED_CONTENT_TYPES[contentType];
  if (!ext) {
    throw ApiError.badRequest('Avatar must be JPEG, PNG, or WebP');
  }
  // crypto.randomUUID gives us a collision-free key under the avatars/ prefix.
  const key = `${AVATAR_PREFIX}/${crypto.randomUUID()}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: env.aws.videoBucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_TTL });
  return { key, uploadUrl };
};

/**
 * Slice 14 B.3: server-side binary upload for generated artifacts (tax
 * invoice PDFs etc.). Caller provides the full S3 key — no auto-prefix —
 * so the invoice service can use the human-readable `invoices/<no>.pdf`
 * layout that mirrors the invoice number.
 */
const uploadBuffer = async ({ key, buffer, contentType }) => {
  ensureConfigured();
  await s3.send(
    new PutObjectCommand({
      Bucket: env.aws.videoBucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return key;
};

/**
 * Slice 14 B.3: returns a Node.js Readable for an S3 object, ready to
 * pipe into an HTTP response. The v3 SDK's `response.Body` is already a
 * Readable stream — we expose it directly so the controller can do
 * `stream.pipe(res)` without buffering the whole PDF into memory.
 */
const getObjectStream = async (key) => {
  ensureConfigured();
  const response = await s3.send(
    new GetObjectCommand({ Bucket: env.aws.videoBucket, Key: key }),
  );
  return response.Body;
};

module.exports = {
  getPresignedUploadUrl,
  getPresignedAvatarUploadUrl,
  uploadImage,
  uploadBuffer,
  getSignedAssetUrl,
  getObjectStream,
  deleteObject,
};
