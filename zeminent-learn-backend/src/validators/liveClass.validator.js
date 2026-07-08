'use strict';

const { body, param } = require('express-validator');

const liveClassIdParam = [
  param('id').isMongoId().withMessage('Invalid live class id'),
];

const createLiveClassValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('instructor').trim().notEmpty().withMessage('Instructor is required'),
  body('course').optional({ nullable: true }).isMongoId().withMessage('Invalid course id'),
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be ISO 8601'),
  body('durationMinutes')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 5, max: 600 })
    .withMessage('Duration must be between 5 and 600 minutes')
    .toInt(),
  body('meetingUrl').trim().notEmpty().withMessage('Meeting URL is required').isURL(),
  body('thumbnail').optional().isString(),
  body('category').optional().isString().trim(),
  body('isPublished').optional().isBoolean().toBoolean(),
];

const updateLiveClassValidator = [
  ...liveClassIdParam,
  body('title').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional().trim().notEmpty(),
  body('instructor').optional().trim().notEmpty(),
  body('course').optional({ nullable: true }).isMongoId(),
  body('startTime').optional().isISO8601(),
  body('durationMinutes').optional().isInt({ min: 5, max: 600 }).toInt(),
  body('meetingUrl').optional().trim().notEmpty().isURL(),
  body('thumbnail').optional().isString(),
  body('category').optional().isString().trim(),
  body('isPublished').optional().isBoolean().toBoolean(),
  body('statusOverride').optional().isIn(['none', 'cancelled']),
];

// Slice 16.4: POST /:liveClassId/send-recording. Param + body together
// — the existing liveClassIdParam keys on `:id`, this one on `:liveClassId`
// to match the new route's param name.
const sendRecordingValidator = [
  param('liveClassId').isMongoId().withMessage('Invalid live class id'),
  body('recordingUrl')
    .trim()
    .notEmpty()
    .withMessage('recordingUrl is required')
    .bail()
    .isURL()
    .withMessage('recordingUrl must be a valid URL')
    .isLength({ max: 1000 }),
  body('notify').optional().isBoolean().toBoolean(),
];

module.exports = {
  liveClassIdParam,
  createLiveClassValidator,
  updateLiveClassValidator,
  sendRecordingValidator,
};
