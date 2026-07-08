'use strict';

/* Slice 14 dev seeder — makes one user eligible for the Placement Guarantee
 * Program by ensuring every lecture in a chosen course has a completed
 * Progress doc for them.
 *
 * Usage:  EMAIL=foo@bar.test node scripts/slice14-seed-eligibility.js
 *
 * Strategy: find the first course the user has any progress on; if none,
 * pick the course with the most lectures. Upsert a completed Progress doc
 * for every lecture in that course. */

require('dotenv').config();
const mongoose = require('mongoose');
const Progress = require('../src/models/progress.model');
const Lecture = require('../src/models/lecture.model');
const Course = require('../src/models/course.model');
const User = require('../src/models/user.model');

(async () => {
  const email = process.env.EMAIL;
  if (!email) {
    console.error('EMAIL env var required');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error(`user ${email} not found`);
    process.exit(1);
  }

  let courseId = (await Progress.findOne({ userId: user._id }))?.courseId;
  if (!courseId) {
    const candidate = await Lecture.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    courseId = candidate[0]?._id;
  }
  if (!courseId) {
    console.error('no course with lectures found in DB');
    process.exit(1);
  }

  const course = await Course.findById(courseId).lean();
  const lectures = await Lecture.find({ course: courseId }).select('_id').lean();
  console.log(
    `seeding completion for ${user.email} on course "${course?.title}" (${lectures.length} lectures)`,
  );

  const now = new Date();
  for (const l of lectures) {
    await Progress.findOneAndUpdate(
      { userId: user._id, lectureId: l._id },
      {
        $set: {
          courseId,
          watchedSeconds: 1,
          durationSeconds: 1,
          completed: true,
          completedAt: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  const completedCount = await Progress.countDocuments({
    userId: user._id,
    courseId,
    completed: true,
  });
  console.log(
    `done. completedLectures=${completedCount} / totalLectures=${lectures.length}`,
  );

  await mongoose.disconnect();
})();
