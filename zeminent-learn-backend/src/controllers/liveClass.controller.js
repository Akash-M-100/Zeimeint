'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const liveClassService = require('../services/liveClass.service');

// POST /api/live-classes — admin
const createLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await liveClassService.createLiveClass(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, 'Live class created', { liveClass }));
});

// GET /api/live-classes — public/optional auth
const getAllLiveClasses = asyncHandler(async (req, res) => {
  const { liveClasses, pagination } = await liveClassService.listLiveClasses(
    req.query,
    req.user,
  );
  res
    .status(200)
    .json(new ApiResponse(200, 'Live classes fetched', { liveClasses, pagination }));
});

// GET /api/live-classes/:id — public/optional auth
const getLiveClassById = asyncHandler(async (req, res) => {
  const liveClass = await liveClassService.getLiveClass(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, 'Live class fetched', { liveClass }));
});

// PATCH /api/live-classes/:id — admin
const updateLiveClass = asyncHandler(async (req, res) => {
  const liveClass = await liveClassService.updateLiveClass(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, 'Live class updated', { liveClass }));
});

// DELETE /api/live-classes/:id — admin
const deleteLiveClass = asyncHandler(async (req, res) => {
  await liveClassService.deleteLiveClass(req.params.id);
  res.status(200).json(new ApiResponse(200, 'Live class deleted', null));
});

// POST /api/live-classes/:liveClassId/send-recording — admin: record
// the recording URL on this occurrence and (default) email every attendee
// on the parent series. notify=false stores silently.
const sendRecording = asyncHandler(async (req, res) => {
  const { recordingUrl, notify } = req.body;
  if (!recordingUrl) throw ApiError.badRequest('recordingUrl is required');

  const result = await liveClassService.sendRecording({
    liveClassId: req.params.liveClassId,
    recordingUrl,
    notify: notify !== false,
  });

  const message =
    result.sentCount > 0
      ? `Recording saved and emailed to ${result.sentCount} attendee(s)`
      : 'Recording saved';

  res
    .status(200)
    .json(
      new ApiResponse(200, message, {
        occurrence: result.occurrence,
        sentCount: result.sentCount,
      }),
    );
});

module.exports = {
  createLiveClass,
  getAllLiveClasses,
  getLiveClassById,
  updateLiveClass,
  deleteLiveClass,
  sendRecording,
};
