'use strict';

const Course = require('../models/course.model');
const Section = require('../models/section.model');
const Lecture = require('../models/lecture.model');
const ApiError = require('../utils/ApiError');
const s3Service = require('./s3.service');

const getCourseOrFail = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  return course;
};

const getSectionOrFail = async (sectionId) => {
  const section = await Section.findById(sectionId);
  if (!section) throw ApiError.notFound('Section not found');
  return section;
};

const createSection = async (courseId, data) => {
  const course = await getCourseOrFail(courseId);

  const order = data.order != null ? data.order : (course.sections?.length || 0);
  const section = await Section.create({
    title: data.title,
    description: data.description || '',
    order,
    course: course._id,
  });

  course.sections.push(section._id);
  await course.save();

  return section;
};

const updateSection = async (sectionId, data) => {
  const section = await getSectionOrFail(sectionId);
  ['title', 'description', 'order'].forEach((field) => {
    if (data[field] !== undefined) section[field] = data[field];
  });
  await section.save();
  return section;
};

const reorderSections = async (courseId, orderedSectionIds) => {
  if (!Array.isArray(orderedSectionIds) || orderedSectionIds.length === 0) {
    throw ApiError.badRequest('sectionIds must be a non-empty array');
  }
  await getCourseOrFail(courseId);

  await Promise.all(
    orderedSectionIds.map((id, index) =>
      Section.updateOne({ _id: id, course: courseId }, { order: index }),
    ),
  );
};

const deleteSection = async (sectionId) => {
  const section = await getSectionOrFail(sectionId);

  // Cascade: remove every S3 video, then the lecture docs, then unlink them
  // from the course's flat lectures array.
  const lectures = await Lecture.find({ section: section._id });
  await Promise.all(lectures.map((lec) => s3Service.deleteObject(lec.videoKey || lec.video?.key)));
  const lectureIds = lectures.map((l) => l._id);
  await Lecture.deleteMany({ _id: { $in: lectureIds } });
  await Course.updateOne(
    { _id: section.course },
    { $pull: { lectures: { $in: lectureIds }, sections: section._id } },
  );

  await section.deleteOne();
};

module.exports = {
  createSection,
  updateSection,
  reorderSections,
  deleteSection,
};
