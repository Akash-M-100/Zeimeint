'use strict';

const mongoose = require('mongoose');

const userPathProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    path: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Path',
      required: true,
    },

    completedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
  },
  {
    timestamps: true,
  }
);

userPathProgressSchema.index({ user: 1, path: 1 }, { unique: true });

module.exports = mongoose.model(
  'UserPathProgress',
  userPathProgressSchema
);
