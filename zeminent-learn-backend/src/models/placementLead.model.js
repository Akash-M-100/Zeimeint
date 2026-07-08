'use strict';

const mongoose = require('mongoose');

const LEAD_STATUS = ['new', 'contacted', 'enrolled', 'rejected', 'archived'];

const placementLeadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    message: {
      type: String,
      default: '',
      maxlength: 1000,
      trim: true,
    },
    preferredCallTime: {
      type: String,
      default: '',
      maxlength: 100,
      trim: true,
    },
    // Snapshot of when (and based on what) the user was deemed eligible at
    // lead-capture time. Useful for sales context — they can ask the user
    // about the specific course they completed.
    eligibleAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedCourseIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Course',
      default: [],
    },
    status: {
      type: String,
      enum: LEAD_STATUS,
      default: 'new',
      index: true,
    },
    statusNotes: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    contactedAt: { type: Date, default: null },
    enrolledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One ACTIVE lead per user. Partial filter limits uniqueness to in-flight
// statuses ('new', 'contacted'); historical rejected/archived/enrolled leads
// don't block a fresh expression of interest. Mongo evaluates the partial
// expression to decide whether to index a doc — a doc whose status leaves
// the in-flight set is silently dropped from the index, no longer colliding.
placementLeadSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['new', 'contacted'] } },
  },
);

placementLeadSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

placementLeadSchema.statics.STATUS = LEAD_STATUS;

module.exports = mongoose.model('PlacementLead', placementLeadSchema);
