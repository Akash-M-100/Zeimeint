'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const progressService = require('../services/progress.service');

// POST /api/progress — upsert progress for one lecture (requires auth)
const updateProgress = asyncHandler(async (req, res) => {
  const progress = await progressService.upsertProgress({
    userId: req.user._id,
    lectureId: req.body.lectureId,
    watchedSeconds: Number(req.body.watchedSeconds) || 0,
    durationSeconds: Number(req.body.durationSeconds) || 0,
  });
  res.status(200).json(new ApiResponse(200, 'Progress saved', { progress }));
});

// GET /api/progress/course/:courseId — all of this user's per-lecture progress
// for one course, keyed by lectureId (requires auth)
const getCourseProgress = asyncHandler(async (req, res) => {
  const progress = await progressService.getCourseProgress({
    userId: req.user._id,
    courseId: req.params.courseId,
  });
  res
    .status(200)
    .json(new ApiResponse(200, 'Course progress fetched', { progress }));
});

// GET /api/progress/summary — per-course rollup across enrolled courses,
// newest-touch first (requires auth)
const getSummary = asyncHandler(async (req, res) => {
  const summary = await progressService.getSummary({ userId: req.user._id });
  res
    .status(200)
    .json(new ApiResponse(200, 'Progress summary fetched', { summary }));
});

module.exports = { updateProgress, getCourseProgress, getSummary };
