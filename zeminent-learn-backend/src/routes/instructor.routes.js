'use strict';

const express = require('express');
const instructorController = require('../controllers/instructor.controller');

const router = express.Router();

// PUBLIC — no `protect`. Anonymous home-page visitors render the roster.
router.get('/', instructorController.listInstructors);

module.exports = router;
