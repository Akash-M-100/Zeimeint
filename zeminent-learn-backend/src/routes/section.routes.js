'use strict';

const express = require('express');
const sectionController = require('../controllers/section.controller');
const dppController = require('../controllers/dpp.controller');
const codeProblemController = require('../controllers/codeProblem.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdminOrInstructor } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  sectionIdParam,
  updateSectionValidator,
} = require('../validators/section.validator');

const router = express.Router();

router.patch(
  '/:id',
  protect,
  isAdminOrInstructor,
  updateSectionValidator,
  validate,
  sectionController.updateSection,
);

router.delete(
  '/:id',
  protect,
  isAdminOrInstructor,
  sectionIdParam,
  validate,
  sectionController.deleteSection,
);

router.post(
  '/:sectionId/dpps',
  protect,
  isAdminOrInstructor,
  dppController.createDPP,
);

router.post(
  '/:sectionId/code-problems',
  protect,
  isAdminOrInstructor,
  codeProblemController.createCodeProblem,
);

module.exports = router;
