'use strict';

const mongoose = require('mongoose');

const SCHEDULE_MODES = ['manual_dates', 'weekly'];
const MEETING_TYPES = ['live_class', 'internal', 'other'];
const SERIES_STATUS = ['active', 'cancelled'];

// External invitee — someone outside the LMS (no User record). Email is the
// natural key; name is optional and only used for the email greeting + ICS
// ATTENDEE CN parameter. No _id needed; the email-on-doc array is the lookup.
const externalInviteeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    name: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

// Recurrence config — only one of the two shapes is meaningful per series,
// keyed by the parent's scheduleMode. Kept loose at the schema level (no
// per-mode required flags) because the controller/validator gates which
// fields must be present; computeOccurrences() also throws on missing pieces.
const scheduleConfigSchema = new mongoose.Schema(
  {
    // mode='manual_dates'
    dates: [{ type: Date }],

    // mode='weekly'
    startDate: { type: Date },
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sun, 6=Sat
    time: { type: String, match: /^\d{2}:\d{2}$/ }, // 'HH:MM' 24h
    occurrenceCount: { type: Number, min: 1, max: 52 },
  },
  { _id: false },
);

const liveClassSeriesSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 300 },
    description: { type: String, maxlength: 5000 },
    category: { type: String, maxlength: 100, index: true },
    thumbnail: { type: String },

    // Discriminator: 'live_class' enforces instructor presence (pre-validate
    // hook below); 'internal' / 'other' allow loose use for staff standups,
    // partner calls, etc. that don't fit the public live-class shape.
    meetingType: {
      type: String,
      enum: MEETING_TYPES,
      default: 'live_class',
      required: true,
      index: true,
    },

    // Optional at schema level; pre-validate enforces for live_class.
    instructor: { type: String, maxlength: 200 },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },

    meetingUrl: { type: String, required: true, maxlength: 1000 },
    durationMinutes: { type: Number, required: true, min: 5, max: 480 },

    scheduleMode: { type: String, enum: SCHEDULE_MODES, required: true },
    scheduleConfig: { type: scheduleConfigSchema, required: true },

    attendees: {
      enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      externalInvitees: [externalInviteeSchema],
    },

    recordingEnabled: { type: Boolean, default: false },

    isPublished: { type: Boolean, default: true },
    status: { type: String, enum: SERIES_STATUS, default: 'active' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Denormalized count so list queries don't need to count children. Set by
    // the create endpoint from the computed occurrence array length.
    totalOccurrences: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

// 'live_class' = public-facing schedule and so requires a named instructor;
// 'internal' / 'other' (standups, partner calls) don't need one.
liveClassSeriesSchema.pre('validate', function enforceInstructorForLiveClass(next) {
  if (this.meetingType === 'live_class') {
    if (!this.instructor || !this.instructor.trim()) {
      return next(new Error('instructor is required when meetingType is live_class'));
    }
  }
  return next();
});

liveClassSeriesSchema.index({ status: 1, createdAt: -1 });
liveClassSeriesSchema.index({ meetingType: 1, status: 1 });

liveClassSeriesSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const LiveClassSeries = mongoose.model('LiveClassSeries', liveClassSeriesSchema);

LiveClassSeries.MEETING_TYPES = MEETING_TYPES;
LiveClassSeries.SCHEDULE_MODES = SCHEDULE_MODES;
LiveClassSeries.SERIES_STATUS = SERIES_STATUS;

module.exports = LiveClassSeries;
