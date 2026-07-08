'use strict';

const Progress = require('../models/progress.model');
const Lecture = require('../models/lecture.model');
const Course = require('../models/course.model');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');

// Treat 95% watched as the completion threshold. Below this we still update
// watchedSeconds but don't flip the `completed` flag.
const COMPLETION_THRESHOLD = 0.95;

/**
 * Upsert a viewer's progress for one lecture.
 *
 * Atomic via aggregation-pipeline update so completion is monotonic:
 *  - `completed` only transitions false → true, never the reverse
 *  - `completedAt` is stamped on that first transition and never overwritten
 *  - `durationSeconds` uses $max to avoid a buggy `0` clobbering a real value
 *  - `watchedSeconds` IS overwritten (rewinds are legitimate user actions)
 *
 * Throws 404 if the lecture doesn't exist (the courseId is read from it on
 * insert so the denormalisation can't drift).
 */
const upsertProgress = async ({
  userId,
  lectureId,
  watchedSeconds,
  durationSeconds,
}) => {
  const lecture = await Lecture.findById(lectureId).select('course');
  if (!lecture) throw ApiError.notFound('Lecture not found');

  // Pipeline updates bypass Mongoose's schema cast, so string IDs would land
  // in Mongo as strings — and a future filter casting to ObjectId would miss
  // the doc, triggering a phantom duplicate-key error on the compound index.
  // Use the lecture's canonical ObjectId form throughout.
  const lectureObjectId = lecture._id;

  const candidateCompleted =
    durationSeconds > 0 &&
    watchedSeconds >= durationSeconds * COMPLETION_THRESHOLD;
  const now = new Date();
  const incomingWatched = Math.max(0, Number(watchedSeconds) || 0);
  const incomingDuration = Math.max(0, Number(durationSeconds) || 0);

  const updated = await Progress.findOneAndUpdate(
    { userId, lectureId: lectureObjectId },
    [
      {
        $set: {
          userId,
          lectureId: lectureObjectId,
          courseId: lecture.course,
          watchedSeconds: incomingWatched,
          durationSeconds: {
            $max: [{ $ifNull: ['$durationSeconds', 0] }, incomingDuration],
          },
          completed: {
            $or: [{ $ifNull: ['$completed', false] }, candidateCompleted],
          },
          completedAt: {
            $cond: [
              {
                $and: [
                  { $not: { $ifNull: ['$completed', false] } },
                  candidateCompleted,
                ],
              },
              now,
              { $ifNull: ['$completedAt', null] },
            ],
          },
        },
      },
    ],
    { upsert: true, new: true },
  );
  return updated;
};

/**
 * All of a viewer's progress for one course, keyed by lectureId.
 * Used by the course detail page when embedding progress into the lecture
 * list, and exposed via GET /api/progress/course/:courseId for any client
 * that wants to fetch progress separately.
 */
const getCourseProgress = async ({ userId, courseId }) => {
  const docs = await Progress.find({ userId, courseId }).lean();
  const map = {};
  for (const d of docs) {
    map[String(d.lectureId)] = {
      watchedSeconds: d.watchedSeconds || 0,
      durationSeconds: d.durationSeconds || 0,
      completed: Boolean(d.completed),
      completedAt: d.completedAt || null,
      updatedAt: d.updatedAt || null,
    };
  }
  return map;
};

/**
 * Per-course rollup across the viewer's purchasedCourses, newest-touch first.
 * Returns enough for a "Continue learning" UI: total lectures, how many
 * completed, percent, and which lecture was last touched (so Resume can
 * deep-link).
 */
const getSummary = async ({ userId }) => {
  const user = await User.findById(userId).select('purchasedCourses').lean();

  // Union the viewer's purchased courses with any course they have progress on.
  // Free/preview lectures create Progress docs without enrolment, so this is
  // what lets a watched (or completed) free video surface on the dashboard.
  const progressedCourseIds = await Progress.distinct('courseId', { userId });
  const courseIdByKey = new Map();
  for (const id of [...(user?.purchasedCourses || []), ...progressedCourseIds]) {
    if (id) courseIdByKey.set(String(id), id);
  }
  const courseIds = [...courseIdByKey.values()];
  if (!courseIds.length) return [];

  const [progressDocs, lectureCounts, courses] = await Promise.all([
    Progress.find({ userId, courseId: { $in: courseIds } }).lean(),
    Lecture.aggregate([
      { $match: { course: { $in: courseIds } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    Course.find({ _id: { $in: courseIds } })
      .select('title thumbnailKey')
      .lean(),
  ]);

  const totalsById = new Map(
    lectureCounts.map((row) => [String(row._id), row.count]),
  );
  const coursesById = new Map(courses.map((c) => [String(c._id), c]));

  const stats = new Map();
  for (const id of courseIds) {
    const key = String(id);
    stats.set(key, {
      courseId: key,
      title: coursesById.get(key)?.title || null,
      totalLectures: totalsById.get(key) || 0,
      // Per-lecture rollup keyed by lectureId, so duplicate progress docs for the
      // same lecture (e.g. watching a video twice) can't inflate the counts.
      lectures: new Map(), // lectureId -> { completed, seconds }
      lastLectureId: null,
      lastWatchedAt: null,
    });
  }
  for (const d of progressDocs) {
    const key = String(d.courseId);
    const s = stats.get(key);
    if (!s) continue;
    const lid = String(d.lectureId);
    const prev = s.lectures.get(lid) || { completed: false, seconds: 0, duration: 0 };
    prev.completed = prev.completed || !!d.completed;
    // furthest-watched position + known duration for the lecture (max, never
    // summed across duplicate docs for the same lecture)
    prev.seconds = Math.max(prev.seconds, Math.max(0, Number(d.watchedSeconds) || 0));
    prev.duration = Math.max(prev.duration, Math.max(0, Number(d.durationSeconds) || 0));
    s.lectures.set(lid, prev);
    const at = d.updatedAt || d.completedAt;
    if (at && (!s.lastWatchedAt || at > s.lastWatchedAt)) {
      s.lastWatchedAt = at;
      s.lastLectureId = lid;
    }
  }

  const summary = Array.from(stats.values()).map((s) => {
    const lectures = [...s.lectures.values()];
    const completed = lectures.filter((l) => l.completed).length;
    // Never report more completed than the course actually has.
    const watchedLectures = s.totalLectures > 0 ? Math.min(completed, s.totalLectures) : completed;
    const watchedSeconds = lectures.reduce((a, l) => a + l.seconds, 0);
    // Fractional progress: a completed lecture counts as a full unit; an
    // in-progress lecture counts by how much of it has been watched. Divided by
    // the course's total lectures, so partly watching a video already moves the
    // progress bar (e.g. 10 of 20 min on lecture 1 of 5 → 10%).
    const progressUnits = lectures.reduce((a, l) => {
      if (l.completed) return a + 1;
      if (l.duration > 0) return a + Math.min(1, l.seconds / l.duration);
      return a;
    }, 0);
    const percent =
      s.totalLectures > 0
        ? Math.min(100, Math.round((progressUnits / s.totalLectures) * 100))
        : 0;
    return {
      courseId: s.courseId,
      title: s.title,
      watchedLectures,
      totalLectures: s.totalLectures,
      watchedSeconds,
      lastLectureId: s.lastLectureId,
      lastWatchedAt: s.lastWatchedAt,
      percent,
    };
  })
    // Drop orphaned progress: courses that were deleted (no title) or have no
    // lectures (totalLectures === 0). Such entries can only ever read 0% and
    // would otherwise drag down dashboard/profile completion figures.
    .filter((s) => s.title && s.totalLectures > 0);

  // Newest touched first; never-touched courses sink to the end.
  summary.sort((a, b) => {
    if (!a.lastWatchedAt && !b.lastWatchedAt) return 0;
    if (!a.lastWatchedAt) return 1;
    if (!b.lastWatchedAt) return -1;
    return new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt);
  });

  return summary;
};

module.exports = { upsertProgress, getCourseProgress, getSummary };
