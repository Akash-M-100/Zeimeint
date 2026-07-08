'use strict';

const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Batch', batchSchema);