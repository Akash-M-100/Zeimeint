'use strict';

const s3Service = require('../services/s3.service');

/**
 * Single source of truth for "how do we shape a user for the wire". Resolves
 * the stored avatarKey to a freshly signed asset URL (CloudFront or S3
 * presigned, depending on env config) and returns the user as a plain object
 * with `avatarUrl` attached.
 *
 * Idempotent — safe to call on already-enriched objects (the URL is just
 * re-signed). Accepts either a mongoose Document (calls toJSON to strip
 * password/__v) or a plain object (.lean() output, spread copy, etc.).
 *
 * @param {object|null} user
 * @returns {Promise<object|null>} enriched user, or whatever was passed in
 *                                 when it's falsy
 */
const enrichUserWithAvatarUrl = async (user) => {
  if (!user) return user;
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  plain.avatarUrl = plain.avatarKey
    ? await s3Service.getSignedAssetUrl(plain.avatarKey)
    : null;
  return plain;
};

module.exports = { enrichUserWithAvatarUrl };
