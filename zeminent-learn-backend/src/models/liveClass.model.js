'use strict';

const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title must be at most 150 characters'],
    },
    // Slice 16.4: relaxed to optional. Originally required from the
    // pre-series design (every standalone class always had a description /
    // instructor). With Series-driven internal meetings (no instructor, no
    // description) feeding occurrences, mandatory text fields meant the
    // 16.3 createSeries had to backfill fake strings — that's now gone.
    description: {
      type: String,
      trim: true,
    },
    instructor: {
      type: String,
      trim: true,
      maxlength: [200, 'Instructor must be at most 200 characters'],
    },
    // Optional link to a course; live classes can also stand alone (e.g. AMAs).
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      max: [600, 'Duration cannot exceed 600 minutes'],
    },
    meetingUrl: {
      type: String,
      required: [true, 'Meeting URL is required'],
      trim: true,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    // Slice 16.4: dropped the 'General' default so internal/other
    // meetings without a meaningful category aren't silently mislabeled.
    // Existing docs are untouched (defaults only apply at save time).
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Category must be at most 100 characters'],
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    // Manual override; if 'cancelled' is set we surface that. Otherwise the
    // computed status (scheduled / live / ended) wins.
    statusOverride: {
      type: String,
      enum: ['none', 'cancelled'],
      default: 'none',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Slice 16: meeting-type discriminator (mirrors LiveClassSeries.meetingType
    // for direct query convenience). Default 'live_class' keeps legacy /
    // standalone classes — created before Series existed — in the public list.
    meetingType: {
      type: String,
      enum: ['live_class', 'internal', 'other'],
      default: 'live_class',
      index: true,
    },

    // Slice 16: linkage to the parent LiveClassSeries. Null for legacy /
    // standalone classes that were created one-off via the old endpoint;
    // populated for every occurrence spawned by the series-create flow.
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveClassSeries',
      default: null,
      index: true,
    },
    occurrenceIndex: { type: Number, default: null, min: 1 },

    recordingEnabled: { type: Boolean, default: false },
    recordingUrl: { type: String, default: null, maxlength: 1000 },

    // Per-occurrence overrides — null means "inherit from the parent series."
    // Lets admins move a single session's meeting URL or swap an instructor
    // for one date without forking the whole series.
    meetingUrlOverride: { type: String, default: null, maxlength: 1000 },
    instructorOverride: { type: String, default: null, maxlength: 200 },
  },
  { timestamps: true },
);

// Computed lifecycle: cancelled (manual) | live (now in window) | scheduled (future) | ended (past).
// Kept as a virtual so listing endpoints don't need a separate read pass.
liveClassSchema.virtual('status').get(function get() {
  if (this.statusOverride === 'cancelled') return 'cancelled';
  const now = Date.now();
  const start = this.startTime ? this.startTime.getTime() : 0;
  const end = start + (this.durationMinutes || 0) * 60 * 1000;
  if (now < start) return 'scheduled';
  if (now >= start && now <= end) return 'live';
  return 'ended';
});

// Slice 16: fast lookup of "all occurrences of series X, in order." The
// admin series-detail view + bulk operations rely on this; the index also
// supports the back-compat case of a null seriesId (legacy standalone).
liveClassSchema.index({ seriesId: 1, occurrenceIndex: 1 });

liveClassSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('LiveClass', liveClassSchema);
