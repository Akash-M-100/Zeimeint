'use strict';

const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title must be at most 150 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // S3 object key of the uploaded video. Playback URLs (signed CloudFront or
    // S3 presigned) are generated from this key on read, never stored.
    // Required only for S3-hosted lectures — YouTube lectures store a
    // `youtubeUrl` instead and leave this empty.
    videoKey: {
      type: String,
      required: function requireVideoKey() {
        return !this.youtubeUrl;
      },
    },
    // Full YouTube watch/share link for lectures hosted on YouTube. When set,
    // the lecture has no S3 asset and playback uses a YouTube embed instead of
    // a signed video URL. Mutually exclusive with `videoKey` in practice.
    youtubeUrl: {
      type: String,
      default: '',
      trim: true,
    },
    // Duration in seconds (read client-side from the file before upload).
    duration: {
      type: Number,
      default: 0,
    },
    // Bytes of the uploaded video, as reported by the client.
    size: {
      type: Number,
      default: 0,
    },
    // Container format (e.g. "mp4"), as reported by the client.
    format: {
      type: String,
      default: '',
    },
    // Position of the lecture within the course (ascending).
    order: {
      type: Number,
      default: 0,
    },
    isPreviewFree: {
      type: Boolean,
      default: false,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      index: true,
      default: null,
    },
  },
  // createdAt is exposed as `uploadedAt` per the schema spec.
  { timestamps: { createdAt: 'uploadedAt', updatedAt: 'updatedAt' } },
);

lectureSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Lecture', lectureSchema);
