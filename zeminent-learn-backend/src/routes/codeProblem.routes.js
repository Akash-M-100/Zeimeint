'use strict';

const express = require('express');
const codeProblemController = require('../controllers/codeProblem.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdminOrInstructor } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/:id', protect, codeProblemController.getCodeProblem);
router.put('/:id', protect, isAdminOrInstructor, codeProblemController.updateCodeProblem);
router.delete('/:id', protect, isAdminOrInstructor, codeProblemController.deleteCodeProblem);

module.exports = router;
