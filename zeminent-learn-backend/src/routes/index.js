'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');
const courseRoutes = require('./course.routes');
const lectureRoutes = require('./lecture.routes');
const sectionRoutes = require('./section.routes');
const paymentRoutes = require('./payment.routes');
const progressRoutes = require('./progress.routes');
const adminRoutes = require('./admin.routes');
const liveClassRoutes = require('./liveClass.routes');
const instructorRoutes = require('./instructor.routes');
const placementRoutes = require('./placement.routes');
const batchRoutes = require('./batch.routes');
const pathRoutes = require('./path.routes');   // <-- ADD THIS
const dppRoutes = require('./dpp.routes');
const codeProblemRoutes = require('./codeProblem.routes');

const router = express.Router();

// Liveness/health probe.
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Zeminent LMS API is healthy',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/lectures', lectureRoutes);
router.use('/sections', sectionRoutes);
router.use('/payments', paymentRoutes);
router.use('/progress', progressRoutes);
router.use('/admin', adminRoutes);
router.use('/live-classes', liveClassRoutes);
router.use('/instructors', instructorRoutes);
router.use('/placement-program', placementRoutes);

// Batch Management Routes
router.use('/batches', batchRoutes);

// Learning Path Routes
router.use('/path', pathRoutes);   // <-- ADD THIS
router.use('/dpps', dppRoutes);
router.use('/code-problems', codeProblemRoutes);

module.exports = router;
