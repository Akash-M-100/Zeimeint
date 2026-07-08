'use strict';

/**
 * Wraps an async route handler so any rejected promise is forwarded to
 * Express's error pipeline instead of crashing the process. Lets controllers
 * use plain `throw`/`await` without try/catch boilerplate.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
