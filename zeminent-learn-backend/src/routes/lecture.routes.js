'use strict';

const express = require('express');
const lectureController = require('../controllers/lecture.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdminOrInstructor } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  updateLectureValidator,
  presignUploadValidator,
  lectureIdParam,
} = require('../validators/lecture.validator');

const router = express.Router();

// Admin: issue a presigned S3 PUT URL so the browser uploads the video directly.
router.post(
  '/presign-upload',
  protect,
  isAdminOrInstructor,
  presignUploadValidator,
  validate,
  lectureController.presignUpload,
);

// Authenticated: access is gated inside the controller (403 if locked).
router.get('/:id', protect, lectureIdParam, validate, lectureController.getLecture);

// Admin: update (optionally replacing the video via video.key) and delete.
router.patch(
  '/:id',
  protect,
  isAdminOrInstructor,
  updateLectureValidator,
  validate,
  lectureController.updateLecture,
);
router.delete(
  '/:id',
  protect,
  isAdminOrInstructor,
  lectureIdParam,
  validate,
  lectureController.deleteLecture,
);

module.exports = router;
