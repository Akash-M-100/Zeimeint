'use strict';

const mongoose = require('mongoose');

const pathSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    courses: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
          required: true,
        },

        order: {
          type: Number,
          required: true,
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Path = mongoose.model('Path', pathSchema);

module.exports = Path;
