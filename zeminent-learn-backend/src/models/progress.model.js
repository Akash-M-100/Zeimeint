'use strict';

const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
    },
    // Denormalised from Lecture for fast per-course rollups. Set once on
    // insert by the service — never re-derived (lectures don't move courses).
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    // Stamped on the first false → true transition; never overwritten.
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// One doc per (user, lecture) — upserts target this key.
progressSchema.index({ userId: 1, lectureId: 1 }, { unique: true });
// "All this user's progress in this course" — dashboard + course-page lookup.
progressSchema.index({ userId: 1, courseId: 1 });

progressSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Progress', progressSchema);
