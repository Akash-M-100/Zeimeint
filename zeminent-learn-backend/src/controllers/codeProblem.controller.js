'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const codeProblemService = require('../services/codeProblem.service');

const createCodeProblem = asyncHandler(async (req, res) => {
  const codeProblem = await codeProblemService.createCodeProblem(req.params.sectionId, req.body);
  res.status(201).json(new ApiResponse(201, 'Code problem created', { codeProblem }));
});

const getCodeProblem = asyncHandler(async (req, res) => {
  const codeProblem = await codeProblemService.getCodeProblem(req.params.id);
  res.status(200).json(new ApiResponse(200, 'Code problem fetched', { codeProblem }));
});

const deleteCodeProblem = asyncHandler(async (req, res) => {
  await codeProblemService.deleteCodeProblem(req.params.id);
  res.status(200).json(new ApiResponse(200, 'Code problem deleted', null));
});

const updateCodeProblem = asyncHandler(async (req, res) => {
  const codeProblem = await codeProblemService.updateCodeProblem(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, 'Code problem updated', { codeProblem }));
});

module.exports = { createCodeProblem, getCodeProblem, updateCodeProblem, deleteCodeProblem };
