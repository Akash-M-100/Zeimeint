'use strict';

const express = require('express');
const liveClassController = require('../controllers/liveClass.controller');
const liveClassSeriesController = require('../controllers/liveClassSeries.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  liveClassIdParam,
  createLiveClassValidator,
  updateLiveClassValidator,
  sendRecordingValidator,
} = require('../validators/liveClass.validator');
const {
  seriesIdParam,
  createSeriesValidator,
  updateSeriesValidator,
} = require('../validators/liveClassSeries.validator');

const router = express.Router();

/* ---------------- Slice 16.3: meeting series (admin only) ---------------- */
// Mounted ABOVE the /:id route so '/series' is not swallowed by the
// optional-auth getLiveClassById handler.
router.post(
  '/series',
  protect,
  isAdmin,
  createSeriesValidator,
  validate,
  liveClassSeriesController.createSeries,
);
router.get(
  '/series',
  protect,
  isAdmin,
  liveClassSeriesController.listSeries,
);
router.get(
  '/series/:seriesId',
  protect,
  isAdmin,
  seriesIdParam,
  validate,
  liveClassSeriesController.getSeries,
);
// Slice 16.4: update + cancel a series. Both mounted under the same
// /series/:seriesId path as GET above so admin can use the standard
// REST verbs from the admin panel.
router.patch(
  '/series/:seriesId',
  protect,
  isAdmin,
  seriesIdParam,
  updateSeriesValidator,
  validate,
  liveClassSeriesController.updateSeries,
);
router.delete(
  '/series/:seriesId',
  protect,
  isAdmin,
  seriesIdParam,
  validate,
  liveClassSeriesController.cancelSeries,
);

// Slice 16.4: per-occurrence recording delivery. Mounted on the
// liveClass scope (not the series scope) because recordings are
// per-session — same series can have URLs trickle in one at a time.
// Must sit ABOVE the catch-all '/:id' routes below or it'd be swallowed.
router.post(
  '/:liveClassId/send-recording',
  protect,
  isAdmin,
  sendRecordingValidator,
  validate,
  liveClassController.sendRecording,
);

/* ---------------- Public / optional-auth reads ---------------- */
router.get('/', optionalAuth, liveClassController.getAllLiveClasses);
router.get(
  '/:id',
  optionalAuth,
  liveClassIdParam,
  validate,
  liveClassController.getLiveClassById,
);

/* ---------------- Admin: CRUD ---------------- */
router.post(
  '/',
  protect,
  isAdmin,
  createLiveClassValidator,
  validate,
  liveClassController.createLiveClass,
);
router.patch(
  '/:id',
  protect,
  isAdmin,
  updateLiveClassValidator,
  validate,
  liveClassController.updateLiveClass,
);
router.delete(
  '/:id',
  protect,
  isAdmin,
  liveClassIdParam,
  validate,
  liveClassController.deleteLiveClass,
);

module.exports = router;
