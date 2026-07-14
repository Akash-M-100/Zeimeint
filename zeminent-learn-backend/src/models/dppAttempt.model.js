'use strict';

const mongoose = require('mongoose');

const dppAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DPPQuestion',
      required: true,
      index: true,
    },
    selectedOption: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('DPPAttempt', dppAttemptSchema);
