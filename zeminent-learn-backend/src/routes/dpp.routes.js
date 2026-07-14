'use strict';

const express = require('express');
const dppController = require('../controllers/dpp.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdminOrInstructor } = require('../middleware/role.middleware');

const router = express.Router();

router.get('/:id', protect, dppController.getDPP);
router.post('/:dppId/questions/:questionId/answer', protect, dppController.answerQuestion);
router.delete('/:id', protect, isAdminOrInstructor, dppController.deleteDPP);

module.exports = router;
