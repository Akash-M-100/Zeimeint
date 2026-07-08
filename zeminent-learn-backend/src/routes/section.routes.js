'use strict';

const express = require('express');
const sectionController = require('../controllers/section.controller');
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

module.exports = router;
