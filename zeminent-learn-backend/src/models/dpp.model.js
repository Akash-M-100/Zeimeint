'use strict';

const mongoose = require('mongoose');

const dppSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'DPP title is required'],
      trim: true,
      maxlength: [150, 'DPP title must be at most 150 characters'],
    },
  },
  { timestamps: true },
);

dppSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('DPP', dppSchema);
