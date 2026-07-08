'use strict';

const express = require('express');
const courseController = require('../controllers/course.controller');
const lectureController = require('../controllers/lecture.controller');
const sectionController = require('../controllers/section.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin, isAdminOrInstructor } = require('../middleware/role.middleware');
const { uploadThumbnail } = require('../middleware/upload.middleware');
const validate = require('../middleware/validate.middleware');
const {
  courseIdParam,
  createCourseValidator,
  updateCourseValidator,
} = require('../validators/course.validator');
const { createLectureValidator } = require('../validators/lecture.validator');
const {
  createSectionValidator,
  reorderSectionsValidator,
} = require('../validators/section.validator');

const router = express.Router();

/* ---------------- Authenticated reads ---------------- */
// Course reads are authenticated because the backend learning path is the
// source of truth for sequence unlocks.
router.get('/', protect, courseController.getAllCourses);
router.get('/:id', protect, courseIdParam, validate, courseController.getCourseById);
router.get(
  '/:courseId/lectures',
  protect,
  lectureController.getLectures,
);

/* ---------------- Course CRUD ---------------- */
// Create + update are open to admins and instructors; delete stays admin-only
// because it cascades to every lecture + S3 asset under the course.
// uploadThumbnail runs before validators so multipart text fields land in
// req.body. JSON requests pass straight through it untouched.
router.post(
  '/',
  protect,
  isAdminOrInstructor,
  uploadThumbnail,
  createCourseValidator,
  validate,
  courseController.createCourse,
);
router.patch(
  '/:id',
  protect,
  isAdminOrInstructor,
  uploadThumbnail,
  updateCourseValidator,
  validate,
  courseController.updateCourse,
);
router.delete(
  '/:id',
  protect,
  isAdmin,
  courseIdParam,
  validate,
  courseController.deleteCourse,
);

/* ---------------- Add a lecture to a course — admin or instructor ---------------- */
// JSON body referencing an already-uploaded S3 video (video.key). The bytes
// were PUT straight to S3 via the /lectures/presign-upload URL.
router.post(
  '/:courseId/lectures',
  protect,
  isAdminOrInstructor,
  createLectureValidator,
  validate,
  lectureController.uploadLecture,
);

/* ---------------- Sections (chapters) under a course — admin or instructor ---------------- */
router.post(
  '/:courseId/sections',
  protect,
  isAdminOrInstructor,
  createSectionValidator,
  validate,
  sectionController.createSection,
);

router.patch(
  '/:courseId/sections/reorder',
  protect,
  isAdminOrInstructor,
  reorderSectionsValidator,
  validate,
  sectionController.reorderSections,
);

module.exports = router;
