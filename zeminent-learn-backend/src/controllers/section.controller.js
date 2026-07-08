'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const sectionService = require('../services/section.service');

// POST /api/courses/:courseId/sections
const createSection = asyncHandler(async (req, res) => {
  const section = await sectionService.createSection(req.params.courseId, req.body);
  res.status(201).json(new ApiResponse(201, 'Section created', { section }));
});

// PATCH /api/sections/:id
const updateSection = asyncHandler(async (req, res) => {
  const section = await sectionService.updateSection(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, 'Section updated', { section }));
});

// PATCH /api/courses/:courseId/sections/reorder  body: { sectionIds: [..] }
const reorderSections = asyncHandler(async (req, res) => {
  await sectionService.reorderSections(req.params.courseId, req.body.sectionIds);
  res.status(200).json(new ApiResponse(200, 'Sections reordered', null));
});

// DELETE /api/sections/:id — cascades lectures + S3 assets
const deleteSection = asyncHandler(async (req, res) => {
  await sectionService.deleteSection(req.params.id);
  res.status(200).json(new ApiResponse(200, 'Section deleted', null));
});

module.exports = {
  createSection,
  updateSection,
  reorderSections,
  deleteSection,
};
