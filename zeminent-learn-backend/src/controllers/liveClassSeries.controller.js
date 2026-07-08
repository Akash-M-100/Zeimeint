'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const liveClassSeriesService = require('../services/liveClassSeries.service');

// POST /api/live-classes/series — admin: create a series + its child
// occurrences atomically, then fire invite emails in the background.
const createSeries = asyncHandler(async (req, res) => {
  const { series, occurrences } = await liveClassSeriesService.createSeries(
    req.body,
    req.user._id,
  );
  res
    .status(201)
    .json(new ApiResponse(201, 'Series created', { series, occurrences }));
});

// GET /api/live-classes/series — admin: list with optional filters
const listSeries = asyncHandler(async (req, res) => {
  const series = await liveClassSeriesService.listSeries({
    meetingType: req.query.meetingType,
    status: req.query.status,
    courseId: req.query.courseId,
  });
  res.status(200).json(new ApiResponse(200, 'Series fetched', { series }));
});

// GET /api/live-classes/series/:seriesId — admin: detail + occurrences
const getSeries = asyncHandler(async (req, res) => {
  const { series, occurrences } = await liveClassSeriesService.getSeries(
    req.params.seriesId,
  );
  res
    .status(200)
    .json(new ApiResponse(200, 'Series fetched', { series, occurrences }));
});

// PATCH /api/live-classes/series/:seriesId — admin: update series +
// propagate selected fields to future, non-cancelled occurrences.
const updateSeries = asyncHandler(async (req, res) => {
  const series = await liveClassSeriesService.updateSeries(
    req.params.seriesId,
    req.body,
  );
  res.status(200).json(new ApiResponse(200, 'Series updated', { series }));
});

// DELETE /api/live-classes/series/:seriesId — admin: cancel a series +
// send METHOD:CANCEL ICS emails to every attendee. Semantically a cancel,
// not a destructive delete — the docs stay for audit.
const cancelSeries = asyncHandler(async (req, res) => {
  const series = await liveClassSeriesService.cancelSeries(req.params.seriesId);
  res.status(200).json(new ApiResponse(200, 'Series cancelled', { series }));
});

module.exports = {
  createSeries,
  listSeries,
  getSeries,
  updateSeries,
  cancelSeries,
};
