'use strict';

const { body, param } = require('express-validator');

const updateProgressValidator = [
  body('lectureId')
    .trim()
    .notEmpty()
    .withMessage('lectureId is required')
    .isMongoId()
    .withMessage('Invalid lectureId'),
  body('watchedSeconds')
    .exists({ checkNull: true })
    .withMessage('watchedSeconds is required')
    .isFloat({ min: 0 })
    .withMessage('watchedSeconds must be a non-negative number')
    .toFloat(),
  body('durationSeconds')
    .exists({ checkNull: true })
    .withMessage('durationSeconds is required')
    .isFloat({ min: 0 })
    .withMessage('durationSeconds must be a non-negative number')
    .toFloat(),
  // Guard against obvious garbage: watchedSeconds way past duration. The 5s
  // pad covers buffer overrun on the last tick before `ended`. Only enforced
  // when durationSeconds is known (>0).
  body().custom((value) => {
    const w = Number(value.watchedSeconds);
    const d = Number(value.durationSeconds);
    if (!Number.isFinite(w) || !Number.isFinite(d)) return true;
    if (d > 0 && w > d + 5) {
      throw new Error('watchedSeconds exceeds durationSeconds');
    }
    return true;
  }),
];

const courseIdParamValidator = [
  param('courseId').isMongoId().withMessage('Invalid courseId'),
];

module.exports = { updateProgressValidator, courseIdParamValidator };
