'use strict';

const multer = require('multer');
const ApiError = require('../utils/ApiError');

// Memory storage: the file lives in a Buffer and is streamed straight to S3 —
// no temp files on disk to clean up. (Lecture videos no longer pass through
// here — the browser uploads them directly to S3 via a presigned URL.)
const storage = multer.memoryStorage();

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const imageFileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  cb(new ApiError(400, 'Only image files are allowed'));
};

/**
 * Parses an optional `thumbnail` image file alongside text fields for course
 * create/update. JSON requests pass through untouched.
 */
const uploadThumbnail = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: imageFileFilter,
}).single('thumbnail');

/**
 * Parses multipart/form-data requests that carry only text fields (no files)
 * into req.body. Use on endpoints that accept JSON OR multipart from a form
 * — express.json() handles the JSON case, this handles the multipart case.
 * Rejects unexpected files so the route doesn't silently accept uploads.
 */
const parseMultipartText = multer().none();

module.exports = { uploadThumbnail, parseMultipartText };
