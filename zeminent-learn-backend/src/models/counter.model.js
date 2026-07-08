'use strict';

const mongoose = require('mongoose');

// Slice 14 B.1: generic atomic counter for sequential IDs (currently used
// by invoice numbering, but the (scope, fy) shape is intentionally generic
// for any future scope like 'CREDIT_NOTE' etc.).
const counterSchema = new mongoose.Schema(
  {
    scope: { type: String, required: true }, // e.g. 'INVOICE'
    fy: { type: String, required: true }, // e.g. '2526'
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

// Compound unique index so (scope, fy) is the natural key for the
// findOneAndUpdate+upsert+$inc atomic pattern.
counterSchema.index({ scope: 1, fy: 1 }, { unique: true });

module.exports = mongoose.model('Counter', counterSchema);
