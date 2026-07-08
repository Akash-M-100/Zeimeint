'use strict';

const { body, param } = require('express-validator');

// Accepts the common YouTube link shapes: watch?v=, youtu.be/, /embed/,
// /shorts/, with or without extra query params.
const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}([&?].*)?$/i;

const isYouTubeUrl = (value) => YOUTUBE_URL_REGEX.test(String(value || '').trim());

// Lecture create/update now carry JSON: the video itself is uploaded straight
// to S3 by the browser, and only `video: { key, duration, size, format }` is
// sent here referencing the resulting object key.

const presignUploadValidator = [
  body('filename').isString().trim().notEmpty().withMessage('filename is required'),
  body('contentType').isString().trim().notEmpty().withMessage('contentType is required'),
];

const createLectureValidator = [
  param('courseId').isMongoId().withMessage('Invalid course id'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title must be at most 150 characters'),
  body('description')
    .optional()
    .trim(),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
    .toInt(),
  body('isPreviewFree')
    .optional()
    .isBoolean()
    .withMessage('isPreviewFree must be a boolean')
    .toBoolean(),
  body('sectionId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('sectionId must be a valid Mongo id'),
  // A lecture needs exactly one source: an uploaded S3 video (video.key) OR a
  // YouTube link. Both are individually optional; the custom check below
  // enforces that at least one is present.
  body('video.key')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('video.key must be a non-empty string'),
  body('video.duration').optional().isNumeric().withMessage('video.duration must be a number'),
  body('video.size').optional().isNumeric().withMessage('video.size must be a number'),
  body('video.format').optional().isString(),
  // Top-level duration (seconds) for YouTube lectures, read off the embed player
  // client-side. S3 lectures send their duration nested under `video` instead.
  body('duration').optional().isNumeric().withMessage('duration must be a number').toFloat(),
  body('youtubeUrl')
    .optional({ checkFalsy: true })
    .custom(isYouTubeUrl)
    .withMessage('youtubeUrl must be a valid YouTube link'),
  body().custom((value) => {
    const hasS3 = Boolean(value?.video?.key);
    const hasYouTube = Boolean(String(value?.youtubeUrl || '').trim());
    if (!hasS3 && !hasYouTube) {
      throw new Error('Provide either an uploaded video (video.key) or a youtubeUrl');
    }
    return true;
  }),
];

const updateLectureValidator = [
  param('id').isMongoId().withMessage('Invalid lecture id'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 150 }),
  body('description')
    .optional()
    .trim(),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
    .toInt(),
  body('isPreviewFree')
    .optional()
    .isBoolean()
    .withMessage('isPreviewFree must be a boolean')
    .toBoolean(),
  body('sectionId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('sectionId must be a valid Mongo id'),
  body('video.key')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('video.key must be a non-empty string when replacing the video'),
  body('video.duration').optional().isNumeric().withMessage('video.duration must be a number'),
  body('video.size').optional().isNumeric().withMessage('video.size must be a number'),
  body('video.format').optional().isString(),
  body('duration').optional().isNumeric().withMessage('duration must be a number').toFloat(),
  body('youtubeUrl')
    .optional({ checkFalsy: true })
    .custom(isYouTubeUrl)
    .withMessage('youtubeUrl must be a valid YouTube link'),
];

const lectureIdParam = [
  param('id').isMongoId().withMessage('Invalid lecture id'),
];

module.exports = {
  presignUploadValidator,
  createLectureValidator,
  updateLectureValidator,
  lectureIdParam,
};
