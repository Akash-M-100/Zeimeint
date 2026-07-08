'use strict';

/**
 * Uniform success envelope for every endpoint:
 *   { success: true, message: string, data: any }
 * Errors use the mirror shape and are produced by the error middleware.
 */
class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }
}

module.exports = ApiResponse;
