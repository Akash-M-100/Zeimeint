'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const courseService = require('../services/course.service');
const lectureService = require('../services/lecture.service');
const s3Service = require('../services/s3.service');

// Multer (memory storage) + S3: if the route ran `uploadThumbnail` and the
// admin attached a file, upload it to S3 and set req.body.thumbnailKey so the
// rest of the flow is file-agnostic. The displayable URL is signed on read.
const maybeUploadThumbnail = async (req) => {
  if (!req.file) return;
  const result = await s3Service.uploadImage(
    req.file.buffer,
    req.file.mimetype,
    req.file.originalname,
  );
  req.body.thumbnailKey = result.key;
};

// POST /api/courses — admin only
const createCourse = asyncHandler(async (req, res) => {
  await maybeUploadThumbnail(req);
  const course = await courseService.createCourse(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, 'Course created', { course }));
});

// GET /api/courses — public (guests/students see published only; admins see all)
const getAllCourses = asyncHandler(async (req, res) => {
  const { courses, pagination } = await courseService.listCourses(req.query, req.user);
  res.status(200).json(new ApiResponse(200, 'Courses fetched', { courses, pagination }));
});

// GET /api/courses/:id — public; includes access-gated lecture list and the
// sectioned grouping the student player needs.
const getCourseById = asyncHandler(async (req, res) => {
  const course = await courseService.getCourse(req.params.id, req.user);
  const { sections, orphanLectures, lectures, viewerHasFullAccess } =
    await lectureService.getLecturesForCourse(course._id, req.user);
  res.status(200).json(
    new ApiResponse(200, 'Course fetched', {
      course,
      viewerHasFullAccess,
      sections,
      orphanLectures,
      lectures,
    }),
  );
});

// PATCH /api/courses/:id — admin only
const updateCourse = asyncHandler(async (req, res) => {
  await maybeUploadThumbnail(req);
  const course = await courseService.updateCourse(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, 'Course updated', { course }));
});

// DELETE /api/courses/:id — admin only (cascades to lectures + S3 assets)
const deleteCourse = asyncHandler(async (req, res) => {
  await courseService.deleteCourse(req.params.id);
  res.status(200).json(new ApiResponse(200, 'Course deleted', null));
});

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};
