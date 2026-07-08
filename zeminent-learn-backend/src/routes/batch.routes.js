'use strict';

const express = require('express');

const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

const batchController = require('../controllers/batch.controller');

const router = express.Router();

// Every batch route requires a valid admin JWT.
router.use(protect, isAdmin);

// Get all batches
router.get('/', batchController.getAllBatches);

// Get a specific batch with all students
router.get('/:batchId', batchController.getBatchById);

module.exports = router;