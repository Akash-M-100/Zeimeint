'use strict';

const Course = require('../models/course.model');
const Lecture = require('../models/lecture.model');
const Section = require('../models/section.model');
const ApiError = require('../utils/ApiError');
const s3Service = require('./s3.service');
const pathService = require('./path.service');

/**
 * Returns a plain course object with a signed `thumbnail` URL derived from
 * `thumbnailKey`. Use on any course leaving the service so clients get a
 * displayable URL without ever seeing the raw S3 key.
 */
const withThumbnailUrl = async (course) => {
  if (!course) return course;
  const data = typeof course.toJSON === 'function' ? course.toJSON() : { ...course };
  data.thumbnail = await s3Service.getSignedAssetUrl(data.thumbnailKey);
  return data;
};

/** Creates a course owned by the given admin. */
const createCourse = async (data, adminId) => {
  const course = await Course.create({
    title: data.title,
    description: data.description,
    category: data.category,
    price: data.price != null ? data.price : 0,
    thumbnailKey: data.thumbnailKey || '',
    isPublished: data.isPublished === true,
    createdBy: adminId,
  });
  return withThumbnailUrl(course);
};

/**
 * Lists courses with optional filtering, search and pagination.
 * Guests and students only ever see published courses; admins see all and
 * may filter by publish state.
 */
const listCourses = async (query, viewer) => {
  const filter = {};
  // Staff (admins + instructors) manage content, so both see drafts.
  const isStaff = viewer?.role === 'admin' || viewer?.role === 'instructor';

  if (query.category) filter.category = query.category;
  if (query.search) filter.title = { $regex: String(query.search), $options: 'i' };

  if (!isStaff) {
    filter.isPublished = true;
  } else if (query.isPublished !== undefined) {
    filter.isPublished = query.isPublished === 'true' || query.isPublished === true;
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Course.countDocuments(filter),
  ]);

  return {
    courses: await Promise.all(courses.map(withThumbnailUrl)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  };
};

/**
 * Fetches a single course. Unpublished courses are treated as "not found"
 * for anyone who isn't an admin.
 */
const getCourse = async (courseId, viewer) => {
  if (!viewer) throw ApiError.unauthorized('Authentication required');
  await pathService.assertCourseUnlockedForUser(courseId, viewer);

  const course = await Course.findById(courseId).populate('createdBy', 'name email');
  if (!course) throw ApiError.notFound('Course not found');

  const isStaff = viewer?.role === 'admin' || viewer?.role === 'instructor';
  if (!course.isPublished && !isStaff) throw ApiError.notFound('Course not found');

  return withThumbnailUrl(course);
};

/** Updates whitelisted course fields. */
const updateCourse = async (courseId, data) => {
  const updatable = [
    'title',
    'description',
    'category',
    'price',
    'thumbnailKey',
    'isPublished',
  ];
  const updates = {};
  updatable.forEach((field) => {
    if (data[field] !== undefined) updates[field] = data[field];
  });

  const course = await Course.findByIdAndUpdate(courseId, updates, {
    new: true,
    runValidators: true,
  });
  if (!course) throw ApiError.notFound('Course not found');
  return withThumbnailUrl(course);
};
//hello
/**
 * Deletes a course and cascades: removes every lecture's S3 video, then the
 * lecture documents, then any sections, then the thumbnail and the course.
 */
const deleteCourse = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');

  const lectures = await Lecture.find({ course: course._id });
  await Promise.all(lectures.map((lec) => s3Service.deleteObject(lec.videoKey || lec.video?.key)));
  await Lecture.deleteMany({ course: course._id });
  await Section.deleteMany({ course: course._id });
  if (course.thumbnailKey) {
    await s3Service.deleteObject(course.thumbnailKey);
  }
  await course.deleteOne();
};

module.exports = {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  deleteCourse,
};
