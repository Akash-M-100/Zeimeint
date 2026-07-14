'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const dppService = require('../services/dpp.service');

const createDPP = asyncHandler(async (req, res) => {
  const dpp = await dppService.createDPP(req.params.sectionId, req.body);
  res.status(201).json(new ApiResponse(201, 'DPP created', { dpp }));
});

const getDPP = asyncHandler(async (req, res) => {
  const dpp = await dppService.getDPPForStudent(req.params.id);
  res.status(200).json(new ApiResponse(200, 'DPP fetched', { dpp }));
});

const deleteDPP = asyncHandler(async (req, res) => {
  await dppService.deleteDPP(req.params.id);
  res.status(200).json(new ApiResponse(200, 'DPP deleted', null));
});

const answerQuestion = asyncHandler(async (req, res) => {
  const result = await dppService.answerQuestion(
    req.user._id,
    req.params.dppId,
    req.params.questionId,
    req.body.selectedOption,
  );
  res.status(200).json(new ApiResponse(200, 'Answer checked', result));
});

module.exports = { createDPP, getDPP, deleteDPP, answerQuestion };
