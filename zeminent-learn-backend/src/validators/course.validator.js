'use strict';

const { body, param } = require('express-validator');

const courseIdParam = [
  param('id').isMongoId().withMessage('Invalid course id'),
];

const createCourseValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title must be at most 150 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a number >= 0')
    .toFloat(),
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean')
    .toBoolean(),
];

const updateCourseValidator = [
  ...courseIdParam,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 150 }),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a number >= 0')
    .toFloat(),
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean')
    .toBoolean(),
];

module.exports = { courseIdParam, createCourseValidator, updateCourseValidator };
