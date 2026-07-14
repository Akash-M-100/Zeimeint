'use strict';

const mongoose = require('mongoose');

const codeProblemSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title must be at most 150 characters'],
    },
    questionText: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    solutionCode: {
      type: String,
      required: [true, 'Solution is required'],
    },
  },
  { timestamps: true },
);

codeProblemSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('CodeProblem', codeProblemSchema);
