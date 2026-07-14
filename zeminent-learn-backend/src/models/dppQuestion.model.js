'use strict';

const mongoose = require('mongoose');

const dppQuestionSchema = new mongoose.Schema(
  {
    dpp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DPP',
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    optionA: { type: String, required: true, trim: true },
    optionB: { type: String, required: true, trim: true },
    optionC: { type: String, required: true, trim: true },
    optionD: { type: String, required: true, trim: true },
    correctOption: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
    },
  },
  { timestamps: true },
);

dppQuestionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('DPPQuestion', dppQuestionSchema);
