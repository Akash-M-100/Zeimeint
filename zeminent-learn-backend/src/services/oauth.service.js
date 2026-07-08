'use strict';

const User = require('../models/user.model');
const generateToken = require('../utils/generateToken');

/**
 * Sign in (or sign up) a user whose identity was just verified by the
 * Next.js OAuth Route Handler. Three-branch upsert:
 *
 *   1. We already have this exact OAuth identity linked
 *      → return the existing user.
 *   2. We have a user with this email but no link yet
 *      → push the new {provider, providerUserId} into their accounts array.
 *      Only attempted when the provider asserts the email is verified, so a
 *      provider that hands us an unverified address can't be used to take
 *      over an existing email/password account.
 *   3. Brand new user
 *      → create with role:'student', accounts pre-populated, no password.
 *      The password field is conditionally required on the schema, so an
 *      empty password is valid as long as accounts.length > 0.
 *
 * Returns the user document (toJSON'd, password hash stripped) and a JWT
 * signed by the existing generateToken util.
 */
const oauthSignIn = async ({
  provider,
  providerUserId,
  email,
  emailVerified,
  name,
}) => {
  const normalizedEmail = String(email).toLowerCase().trim();

  // Branch 1: existing OAuth linkage.
  let user = await User.findOne({
    accounts: { $elemMatch: { provider, providerUserId } },
  });

  // Branch 2: existing email user — link the new identity to them.
  if (!user && emailVerified) {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      // Filter guards against duplicate {provider, providerUserId} entries so
      // a retried bridge call is idempotent.
      await User.updateOne(
        {
          _id: existing._id,
          accounts: {
            $not: { $elemMatch: { provider, providerUserId } },
          },
        },
        {
          $push: {
            accounts: { provider, providerUserId, linkedAt: new Date() },
          },
        },
      );
      // Re-fetch so the returned doc reflects the freshly pushed account.
      user = await User.findById(existing._id);
    }
  }

  // Branch 3: brand new user.
  if (!user) {
    user = await User.create({
      name,
      email: normalizedEmail,
      role: 'student',
      accounts: [{ provider, providerUserId, linkedAt: new Date() }],
      // The provider asserts whether the email is verified; trust that here so
      // OAuth signups skip the email-verification flow.
      isEmailVerified: Boolean(emailVerified),
      // no password — schema's conditional `required` allows this because
      // accounts.length > 0.
    });
  }

  return { user: user.toJSON(), token: generateToken(user) };
};

module.exports = { oauthSignIn };
