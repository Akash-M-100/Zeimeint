'use strict';

const express = require('express');
const progressController = require('../controllers/progress.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  updateProgressValidator,
  courseIdParamValidator,
} = require('../validators/progress.validator');

const router = express.Router();

// All progress routes are per-user — every handler needs a logged-in viewer.
router.use(protect);

router.post(
  '/',
  updateProgressValidator,
  validate,
  progressController.updateProgress,
);
router.get(
  '/course/:courseId',
  courseIdParamValidator,
  validate,
  progressController.getCourseProgress,
);
router.get('/summary', progressController.getSummary);

module.exports = router;
