'use strict';

const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');

const {
  getLearningPath,
  completeCourse,
  createPath,
} = require('../controllers/path.controller');

router.post('/', protect, createPath);

router.get('/', protect, getLearningPath);

router.post('/complete/:courseId', protect, completeCourse);

module.exports = router;