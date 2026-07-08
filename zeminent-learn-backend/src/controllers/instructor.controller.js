'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const User = require('../models/user.model');
const { enrichUserWithAvatarUrl } = require('../utils/userResponse');

// GET /api/instructors — PUBLIC. Lists instructors (and admins, who can also
// teach) opted-in to the marketing-home roster, sorted alphabetically.
// Returns just the public-facing fields — never password / email / role / etc.
// Each row gets a signed avatar URL resolved from avatarKey via the shared
// enrichUserWithAvatarUrl helper — single source of truth across the API.
const listInstructors = asyncHandler(async (_req, res) => {
  const instructors = await User.find({
    role: { $in: ['instructor', 'admin'] },
    isVisibleOnHomePage: true,
  })
    .select(
      'name title bio avatarKey socialLinks expertise yearsOfExperience',
    )
    .sort({ name: 1 })
    .lean();

  const withAvatars = await Promise.all(instructors.map(enrichUserWithAvatarUrl));

  res
    .status(200)
    .json(
      new ApiResponse(200, 'Instructors fetched', { instructors: withAvatars }),
    );
});

module.exports = { listInstructors };
