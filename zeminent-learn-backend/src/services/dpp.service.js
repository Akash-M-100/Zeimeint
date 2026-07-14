'use strict';

const Section = require('../models/section.model');
const DPP = require('../models/dpp.model');
const DPPQuestion = require('../models/dppQuestion.model');
const DPPAttempt = require('../models/dppAttempt.model');
const ApiError = require('../utils/ApiError');

const sanitizeQuestion = (q) => ({
  _id: q._id,
  questionText: q.questionText,
  optionA: q.optionA,
  optionB: q.optionB,
  optionC: q.optionC,
  optionD: q.optionD,
});

const validateQuestions = (questions = []) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw ApiError.badRequest('Add at least one question');
  }
  questions.forEach((q, index) => {
    const fields = ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctOption'];
    const missing = fields.find((field) => !String(q[field] || '').trim());
    if (missing) throw ApiError.badRequest(`Question ${index + 1} is incomplete`);
    if (!['A', 'B', 'C', 'D'].includes(q.correctOption)) {
      throw ApiError.badRequest(`Question ${index + 1} has invalid correct option`);
    }
  });
};

const createDPP = async (sectionId, data) => {
  const section = await Section.findById(sectionId);
  if (!section) throw ApiError.notFound('Section not found');
  if (!String(data.title || '').trim()) throw ApiError.badRequest('DPP title is required');
  validateQuestions(data.questions);

  const dpp = await DPP.create({ section: section._id, title: data.title });
  const questions = await DPPQuestion.insertMany(
    data.questions.map((q) => ({
      dpp: dpp._id,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
    })),
  );

  return { ...dpp.toJSON(), questions: questions.map((q) => q.toJSON()) };
};

const getDPPForStudent = async (id) => {
  const dpp = await DPP.findById(id).lean();
  if (!dpp) throw ApiError.notFound('DPP not found');
  const questions = await DPPQuestion.find({ dpp: id }).sort({ createdAt: 1 }).lean();
  return { ...dpp, questions: questions.map(sanitizeQuestion) };
};

const deleteDPP = async (id) => {
  const dpp = await DPP.findById(id);
  if (!dpp) throw ApiError.notFound('DPP not found');
  await DPPQuestion.deleteMany({ dpp: dpp._id });
  await dpp.deleteOne();
};

const answerQuestion = async (userId, dppId, questionId, selectedOption) => {
  if (!['A', 'B', 'C', 'D'].includes(selectedOption)) {
    throw ApiError.badRequest('Invalid option');
  }
  const question = await DPPQuestion.findOne({ _id: questionId, dpp: dppId });
  if (!question) throw ApiError.notFound('Question not found');
  const isCorrect = question.correctOption === selectedOption;
  await DPPAttempt.create({
    user: userId,
    question: question._id,
    selectedOption,
    isCorrect,
  });
  return { correct: isCorrect, correctOption: question.correctOption };
};

module.exports = { createDPP, getDPPForStudent, deleteDPP, answerQuestion };
