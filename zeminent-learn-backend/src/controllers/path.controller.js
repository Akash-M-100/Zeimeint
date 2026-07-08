'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Path = require('../models/pathModel');
const pathService = require('../services/path.service');

const getLearningPath = asyncHandler(async (req, res) => {
  const payload = await pathService.getLearningPathForUser(req.user._id);

  res.status(200).json({
    success: true,
    ...payload,
  });
});

const completeCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  await pathService.completeCourseForUser(req.user._id, courseId);

  res.status(200).json({
    success: true,
    message: 'Course marked as completed.',
  });
});

const createPath = asyncHandler(async (req, res) => {
  const { title, courses } = req.body;

  const existingPath = await Path.findOne();

  if (existingPath) {
    throw ApiError.badRequest('Learning path already exists');
  }

  const formattedCourses = courses.map((courseId, index) => ({
    course: courseId,
    order: index + 1,
  }));

  const path = await Path.create({
    title,
    isActive: true,
    courses: formattedCourses,
  });

  res.status(201).json({
    success: true,
    message: 'Learning path created successfully.',
    path,
  });
});

module.exports = {
  getLearningPath,
  completeCourse,
  createPath,
};
