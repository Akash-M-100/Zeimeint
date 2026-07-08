'use strict';

const User = require('../models/user.model');
const env = require('../config/env');

/**
 * Ensures a default admin account exists. Runs once on every startup:
 *  - creates the admin from ADMIN_* env vars if it's missing
 *  - promotes an existing account with that email to `admin` if needed
 *  - marks the admin email-verified (the seed mailbox is internal/fake, so it
 *    can't go through the email-verification flow)
 *  - otherwise does nothing (idempotent)
 */
const seedAdmin = async () => {
  const existing = await User.findOne({ email: env.admin.email });

  if (existing) {
    let changed = false;
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      changed = true;
    }
    // Backfill an admin seeded before this flag existed.
    if (!existing.isEmailVerified) {
      existing.isEmailVerified = true;
      changed = true;
    }
    if (changed) {
      await existing.save();
      console.log(`✅ Updated default admin (${env.admin.email})`);
    } else {
      console.log(`✅ Default admin present (${env.admin.email})`);
    }
    return;
  }

  // Password is hashed by the User model's pre-save hook.
  await User.create({
    name: env.admin.name,
    email: env.admin.email,
    password: env.admin.password,
    role: 'admin',
    isEmailVerified: true,
  });
  console.log(`✅ Default admin created → ${env.admin.email}`);
};

module.exports = seedAdmin;
