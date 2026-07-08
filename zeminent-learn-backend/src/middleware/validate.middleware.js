'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after a chain of express-validator rules. Collects any failures into
 * the standard error envelope; otherwise hands off to the controller.
 */
const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({
    field: e.path || e.param,
    message: e.msg,
  }));
  next(ApiError.badRequest('Validation failed', errors));
};

module.exports = validate;
