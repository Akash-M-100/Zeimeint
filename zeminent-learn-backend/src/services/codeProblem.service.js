'use strict';

const Section = require('../models/section.model');
const CodeProblem = require('../models/codeProblem.model');
const ApiError = require('../utils/ApiError');

const createCodeProblem = async (sectionId, data) => {
  const section = await Section.findById(sectionId);
  if (!section) throw ApiError.notFound('Section not found');

  const title = String(data.title || '').trim();
  const questionText = String(data.questionText || '').trim();
  const solutionCode = String(data.solutionCode || '');
  if (!title) throw ApiError.badRequest('Title is required');
  if (!questionText) throw ApiError.badRequest('Question is required');
  if (!solutionCode.trim()) throw ApiError.badRequest('Solution is required');

  return CodeProblem.create({ section: section._id, title, questionText, solutionCode });
};

const getCodeProblem = async (id) => {
  const codeProblem = await CodeProblem.findById(id).select('title questionText solutionCode').lean();
  if (!codeProblem) throw ApiError.notFound('Code problem not found');
  return codeProblem;
};

const updateCodeProblem = async (id, data) => {
  const codeProblem = await CodeProblem.findById(id);
  if (!codeProblem) throw ApiError.notFound('Code problem not found');
  ['title', 'questionText', 'solutionCode'].forEach((field) => {
    if (data[field] !== undefined) codeProblem[field] = data[field];
  });
  await codeProblem.save();
  return codeProblem;
};

const deleteCodeProblem = async (id) => {
  const codeProblem = await CodeProblem.findById(id);
  if (!codeProblem) throw ApiError.notFound('Code problem not found');
  await codeProblem.deleteOne();
};

module.exports = { createCodeProblem, getCodeProblem, updateCodeProblem, deleteCodeProblem };
