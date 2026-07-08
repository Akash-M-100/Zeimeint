'use strict';

const { body, param } = require('express-validator');

const sectionIdParam = [
  param('id').isMongoId().withMessage('Invalid section id'),
];

const courseIdParam = [
  param('courseId').isMongoId().withMessage('Invalid course id'),
];

const createSectionValidator = [
  ...courseIdParam,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Section title is required')
    .isLength({ max: 150 })
    .withMessage('Section title must be at most 150 characters'),
  body('description').optional().trim(),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
    .toInt(),
];

const updateSectionValidator = [
  ...sectionIdParam,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Section title cannot be empty')
    .isLength({ max: 150 }),
  body('description').optional().trim(),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer')
    .toInt(),
];

const reorderSectionsValidator = [
  ...courseIdParam,
  body('sectionIds')
    .isArray({ min: 1 })
    .withMessage('sectionIds must be a non-empty array'),
  body('sectionIds.*').isMongoId().withMessage('Each section id must be a valid Mongo id'),
];

module.exports = {
  sectionIdParam,
  createSectionValidator,
  updateSectionValidator,
  reorderSectionsValidator,
};
