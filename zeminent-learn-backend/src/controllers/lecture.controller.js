'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const lectureService = require('../services/lecture.service');

// POST /api/lectures/presign-upload — admin only; returns a presigned S3 PUT
// URL + object key so the browser can upload the video directly to S3.
const presignUpload = asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;
  const { key, uploadUrl } = await lectureService.presignUpload({ filename, contentType });
  res.status(200).json(new ApiResponse(200, 'Upload URL issued', { key, uploadUrl }));
});

// POST /api/courses/:courseId/lectures — admin only; JSON metadata referencing
// an already-uploaded S3 video (`video: { key, duration, size, format }`).
const uploadLecture = asyncHandler(async (req, res) => {
  const lecture = await lectureService.createLecture(req.params.courseId, req.body);
  res.status(201).json(new ApiResponse(201, 'Lecture uploaded', { lecture }));
});

// GET /api/courses/:courseId/lectures — access-gated lecture list for the viewer.
// Returns both the sectioned grouping and the legacy flat `lectures` list so
// older callers keep working.
const getLectures = asyncHandler(async (req, res) => {
  const { course, sections, orphanLectures, lectures } =
    await lectureService.getLecturesForCourse(req.params.courseId, req.user);
  res.status(200).json(
    new ApiResponse(200, 'Lectures fetched', {
      courseId: course._id,
      course,
      sections,
      orphanLectures,
      lectures,
    }),
  );
});

// GET /api/lectures/:id — single lecture; 403 if locked for the viewer
const getLecture = asyncHandler(async (req, res) => {
  const lecture = await lectureService.getLectureForUser(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, 'Lecture fetched', { lecture }));
});

// PATCH /api/lectures/:id — admin only; optional `video.key` replaces the asset
const updateLecture = asyncHandler(async (req, res) => {
  const lecture = await lectureService.updateLecture(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, 'Lecture updated', { lecture }));
});

// DELETE /api/lectures/:id — admin only (removes the S3 asset too)
const deleteLecture = asyncHandler(async (req, res) => {
  await lectureService.deleteLecture(req.params.id);
  res.status(200).json(new ApiResponse(200, 'Lecture deleted', null));
});

module.exports = {
  presignUpload,
  uploadLecture,
  getLectures,
  getLecture,
  updateLecture,
  deleteLecture,
};
