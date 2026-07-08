'use strict';

const mongoose = require('mongoose');
const Path = require('../models/pathModel');
const Course = require('../models/course.model');
const UserPathProgress = require('../models/userPathProgress.model');
const ApiError = require('../utils/ApiError');
const s3Service = require('./s3.service');

const normalizeId = (id) => String(id?._id || id);

const isStaff = (user) => user?.role === 'admin' || user?.role === 'instructor';

const getActivePath = async ({ populate = false } = {}) => {
  let query = Path.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (populate) query = query.populate('courses.course');
  let path = await query;

  if (!path) {
    query = Path.findOne().sort({ createdAt: 1 });
    if (populate) query = query.populate('courses.course');
    path = await query;
  }

  return path;
};

const syncPathWithPublishedCourses = async (path) => {
  const publishedCourses = await Course.find({ isPublished: true }).sort({ createdAt: 1 });

  if (!path) {
    if (publishedCourses.length === 0) return null;

    return Path.create({
      title: 'Zeminent Learning Path',
      isActive: true,
      courses: publishedCourses.map((course, index) => ({
        course: course._id,
        order: index + 1,
      })),
    });
  }

  const publishedIds = new Set(publishedCourses.map((course) => normalizeId(course._id)));
  const seenIds = new Set();
  const keptCourses = [];

  for (const item of path.courses || []) {
    const courseId = normalizeId(item.course);
    if (!publishedIds.has(courseId) || seenIds.has(courseId)) continue;
    seenIds.add(courseId);
    keptCourses.push(item);
  }

  let nextOrder = keptCourses.reduce((max, item) => Math.max(max, item.order || 0), 0) + 1;
  for (const course of publishedCourses) {
    const courseId = normalizeId(course._id);
    if (seenIds.has(courseId)) continue;
    seenIds.add(courseId);
    keptCourses.push({
      course: course._id,
      order: nextOrder,
    });
    nextOrder += 1;
  }

  const changed =
    keptCourses.length !== (path.courses || []).length ||
    keptCourses.some((item, index) => {
      const previous = path.courses[index];
      return (
        !previous ||
        normalizeId(previous.course) !== normalizeId(item.course) ||
        previous.order !== item.order
      );
    });

  if (changed) {
    path.courses = keptCourses;
    await path.save();
  }

  return path;
};

const getSyncedActivePath = async ({ populate = false } = {}) => {
  let path = await getActivePath();
  path = await syncPathWithPublishedCourses(path);

  if (!path || !populate) return path;
  return Path.findById(path._id).populate('courses.course');
};

const getOrCreateProgress = async (userId, pathId) => {
  let progress = await UserPathProgress.findOne({
    user: userId,
    path: pathId,
  });

  if (!progress) {
    progress = await UserPathProgress.create({
      user: userId,
      path: pathId,
      completedCourses: [],
    });
  }

  return progress;
};

const buildCourseStates = async (path, progress) => {
  const completedIds = new Set((progress?.completedCourses || []).map(normalizeId));
  const orderedItems = [...(path.courses || [])].sort((a, b) => a.order - b.order);

  return Promise.all(orderedItems
    .filter((item) => item.course)
    .map(async (item, index) => {
      const courseId = normalizeId(item.course);
      const completed = completedIds.has(courseId);
      const previousCourseId = index > 0 ? normalizeId(orderedItems[index - 1].course) : null;
      const unlocked = index === 0 || completed || completedIds.has(previousCourseId);
      const course =
        typeof item.course.toObject === 'function' ? item.course.toObject() : item.course;
      course.thumbnail = await s3Service.getSignedAssetUrl(course.thumbnailKey);

      return {
        ...course,
        order: item.order,
        completed,
        unlocked,
      };
    }));
};

const getLearningPathForUser = async (userId) => {
  const path = await getSyncedActivePath({ populate: true });
  if (!path) throw ApiError.notFound('Learning path not found');
  if (!path.courses || path.courses.length === 0) {
    throw ApiError.notFound('Learning path has no courses');
  }

  const progress = await getOrCreateProgress(userId, path._id);

  return {
    title: path.title,
    courses: await buildCourseStates(path, progress),
  };
};

const assertCourseUnlockedForUser = async (courseId, user) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw ApiError.badRequest('Invalid course id');
  }

  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  if (isStaff(user)) return { course, unlocked: true };

  const path = await getSyncedActivePath();
  if (!path) throw ApiError.notFound('Learning path not found');
  if (!path.courses || path.courses.length === 0) {
    throw ApiError.notFound('Learning path has no courses');
  }

  const orderedItems = [...path.courses].sort((a, b) => a.order - b.order);
  const index = orderedItems.findIndex((item) => normalizeId(item.course) === String(courseId));
  if (index === -1) throw ApiError.forbidden('Course is not part of the learning path');

  const progress = await getOrCreateProgress(user._id, path._id);
  const completedIds = new Set(progress.completedCourses.map(normalizeId));
  const previousCourseId = index > 0 ? normalizeId(orderedItems[index - 1].course) : null;
  const unlocked = index === 0 || completedIds.has(String(courseId)) || completedIds.has(previousCourseId);

  if (!unlocked) {
    throw ApiError.forbidden('Complete the previous course to unlock this course');
  }

  return { course, unlocked: true };
};

const completeCourseForUser = async (userId, courseId) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw ApiError.badRequest('Invalid course id');
  }

  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');

  const path = await getSyncedActivePath();
  if (!path) throw ApiError.notFound('Learning path not found');
  if (!path.courses || path.courses.length === 0) {
    throw ApiError.notFound('Learning path has no courses');
  }

  const orderedItems = [...path.courses].sort((a, b) => a.order - b.order);
  const index = orderedItems.findIndex((item) => normalizeId(item.course) === String(courseId));
  if (index === -1) throw ApiError.badRequest('Course is not inside the learning path');

  const progress = await getOrCreateProgress(userId, path._id);
  const completedIds = new Set(progress.completedCourses.map(normalizeId));
  const previousCourseId = index > 0 ? normalizeId(orderedItems[index - 1].course) : null;
  const unlocked = index === 0 || completedIds.has(String(courseId)) || completedIds.has(previousCourseId);

  if (!unlocked) {
    throw ApiError.forbidden('Complete the previous course before completing this course');
  }

  if (!completedIds.has(String(courseId))) {
    progress.completedCourses.push(course._id);
    await progress.save();
  }

  return progress;
};

const ensureSingleLearningPath = async () => {
  const paths = await Path.find().sort({ createdAt: 1 });

  if (paths.length > 0) {
    const activePath = paths.find((path) => path.isActive !== false) || paths[0];
    await Path.updateMany({ _id: { $ne: activePath._id } }, { $set: { isActive: false } });
    if (activePath.isActive !== true) {
      activePath.isActive = true;
      await activePath.save();
    }
    return syncPathWithPublishedCourses(activePath);
  }

  const path = await syncPathWithPublishedCourses(null);
  if (!path) {
    console.log('Learning path seed skipped: no published courses found');
    return null;
  }

  console.log(`Learning path created with ${path.courses.length} courses`);
  return path;
};

module.exports = {
  getActivePath,
  getSyncedActivePath,
  getLearningPathForUser,
  assertCourseUnlockedForUser,
  completeCourseForUser,
  ensureSingleLearningPath,
};
