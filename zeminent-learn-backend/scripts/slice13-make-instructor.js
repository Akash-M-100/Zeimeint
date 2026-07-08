'use strict';

/* One-shot: promotes the smoke-test user to role=instructor so the public
 * /api/instructors endpoint can include them. Delete after testing.
 *
 * Usage:  EMAIL=slice12-test@zeminent.test node scripts/slice13-make-instructor.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');

(async () => {
  const email = process.env.EMAIL;
  if (!email) {
    console.error('EMAIL env var required');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await User.updateOne(
    { email: email.toLowerCase().trim() },
    { $set: { role: 'instructor' } },
  );
  console.log(
    `matched=${result.matchedCount} modified=${result.modifiedCount} for ${email}`,
  );
  await mongoose.disconnect();
})();
