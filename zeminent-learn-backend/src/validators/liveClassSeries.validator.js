'use strict';

const { body, param } = require('express-validator');

const MEETING_TYPES = ['live_class', 'internal', 'other'];

// Slice 16.4 (post-cleanup): new series creation only accepts manual_dates.
// The model + computeOccurrences still understand 'weekly' so existing
// weekly series in the DB keep working through GET / PATCH / DELETE /
// send-recording — the deprecation is at the create surface only.
const ACCEPTED_SCHEDULE_MODES_ON_CREATE = ['manual_dates'];

const seriesIdParam = [
  param('seriesId').isMongoId().withMessage('Invalid series id'),
];

// .if() conditionals are used so a 'weekly' submission isn't penalised for
// missing manual_dates fields (and vice versa). express-validator evaluates
// the conditional against the parsed body, so meetingType / scheduleMode
// must come earlier in the chain — order matters.
const createSeriesValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 300 })
    .withMessage('Title must be at most 300 characters'),

  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Description must be at most 5000 characters'),

  body('category').optional({ nullable: true }).isString().trim(),
  body('thumbnail').optional({ nullable: true }).isString(),

  body('meetingType')
    .notEmpty()
    .withMessage('meetingType is required')
    .bail()
    .isIn(MEETING_TYPES)
    .withMessage(`meetingType must be one of: ${MEETING_TYPES.join(', ')}`),

  // 'live_class' is the only public-facing type and is the only one that
  // requires a named instructor (mirrors the LiveClassSeries pre-validate
  // hook so the failure surfaces as a clean 400 instead of a 500).
  body('instructor')
    .if(body('meetingType').equals('live_class'))
    .trim()
    .notEmpty()
    .withMessage('instructor is required when meetingType is live_class')
    .isLength({ max: 200 }),
  body('instructor')
    .if(body('meetingType').not().equals('live_class'))
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 200 }),

  body('course').optional({ nullable: true }).isMongoId().withMessage('Invalid course id'),

  body('meetingUrl')
    .trim()
    .notEmpty()
    .withMessage('meetingUrl is required')
    .isURL()
    .withMessage('meetingUrl must be a valid URL')
    .isLength({ max: 1000 }),

  body('durationMinutes')
    .notEmpty()
    .withMessage('durationMinutes is required')
    .bail()
    .isInt({ min: 5, max: 480 })
    .withMessage('durationMinutes must be between 5 and 480')
    .toInt(),

  body('scheduleMode')
    .notEmpty()
    .withMessage('scheduleMode is required')
    .bail()
    .isIn(ACCEPTED_SCHEDULE_MODES_ON_CREATE)
    .withMessage(
      "Only 'manual_dates' scheduling is supported. Weekly recurrence has been removed; use multi-date selection instead.",
    ),

  body('scheduleConfig')
    .notEmpty()
    .withMessage('scheduleConfig is required')
    .bail()
    .isObject()
    .withMessage('scheduleConfig must be an object'),

  /* ---- manual_dates branch (only accepted mode on CREATE post-16.4) ---- */
  body('scheduleConfig.dates')
    .isArray({ min: 1 })
    .withMessage('scheduleConfig.dates must be a non-empty array'),
  body('scheduleConfig.dates.*')
    .isISO8601()
    .withMessage('Each date must be ISO 8601'),

  /* ---- attendees ---- */
  body('attendees').optional({ nullable: true }).isObject(),
  body('attendees.enrolledStudents')
    .optional({ nullable: true })
    .isArray()
    .withMessage('attendees.enrolledStudents must be an array'),
  body('attendees.enrolledStudents.*')
    .optional()
    .isMongoId()
    .withMessage('attendees.enrolledStudents must contain MongoIds'),
  body('attendees.externalInvitees')
    .optional({ nullable: true })
    .isArray()
    .withMessage('attendees.externalInvitees must be an array'),
  body('attendees.externalInvitees.*.email')
    .if(body('attendees.externalInvitees').exists())
    .isEmail()
    .withMessage('Each external invitee must have a valid email'),
  body('attendees.externalInvitees.*.name')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 200 }),

  body('recordingEnabled').optional({ nullable: true }).isBoolean().toBoolean(),
  body('isPublished').optional({ nullable: true }).isBoolean().toBoolean(),
];

// Slice 16.4: PATCH /series/:seriesId. All fields optional — required
// constraints only fire when the field is present. The service layer
// rejects schedule + meetingType changes with a clean 400, so we don't
// re-state those forbidden fields here.
const updateSeriesValidator = [
  body('title').optional().isString().trim().isLength({ min: 1, max: 300 }),
  body('description').optional().isString().trim().isLength({ max: 5000 }),
  body('category').optional().isString().trim().isLength({ max: 100 }),
  body('thumbnail').optional().isString(),
  body('instructor').optional().isString().trim().isLength({ max: 200 }),
  body('course').optional({ nullable: true }).isMongoId().withMessage('Invalid course id'),
  body('meetingUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('meetingUrl must be a valid URL')
    .isLength({ max: 1000 }),
  body('durationMinutes')
    .optional()
    .isInt({ min: 5, max: 480 })
    .withMessage('durationMinutes must be between 5 and 480')
    .toInt(),
  body('attendees').optional({ nullable: true }).isObject(),
  body('attendees.enrolledStudents').optional({ nullable: true }).isArray(),
  body('attendees.enrolledStudents.*').optional().isMongoId(),
  body('attendees.externalInvitees').optional({ nullable: true }).isArray(),
  body('attendees.externalInvitees.*.email').optional().isEmail(),
  body('attendees.externalInvitees.*.name').optional().isString().isLength({ max: 200 }),
  body('recordingEnabled').optional().isBoolean().toBoolean(),
  body('isPublished').optional().isBoolean().toBoolean(),
];

module.exports = {
  seriesIdParam,
  createSeriesValidator,
  updateSeriesValidator,
};
