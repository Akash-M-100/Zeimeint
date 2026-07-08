'use strict';

const Batch = require('../models/batch.model');
const ApiError = require('../utils/ApiError');

const BATCH_SIZE = 25;

/**
 * Automatically assigns a student to a learning batch.
 * Batch size is fixed at 25 students.
 */
const assignStudentToBatch = async (userId) => {

  // Check whether the student already belongs to a batch
  const existingBatch = await Batch.findOne({
    students: userId,
  });

  if (existingBatch) {
    return existingBatch;
  }

  // Get the latest batch
  let latestBatch = await Batch.findOne()
    .sort({ batchNumber: -1 });

  // No batches exist yet
  if (!latestBatch) {

    latestBatch = await Batch.create({
      batchNumber: 1,
      students: [userId],
    });

    return latestBatch;
  }

  // Latest batch still has space
  if (latestBatch.students.length < BATCH_SIZE) {

    latestBatch.students.push(userId);

    await latestBatch.save();

    return latestBatch;
  }

  // Latest batch is full → Create a new batch
  const newBatch = await Batch.create({
    batchNumber: latestBatch.batchNumber + 1,
    students: [userId],
  });

  return newBatch;
};

/**
 * Returns all batches with student details.
 */
const getAllBatches = async () => {

  return Batch.find()
    .sort({ batchNumber: 1 })
    .populate('students', 'name email role');

};

/**
 * Returns one batch with all students.
 */
const getBatchById = async (batchId) => {

  const batch = await Batch.findById(batchId)
    .populate('students', 'name email role');

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  return batch;
};

module.exports = {
  assignStudentToBatch,
  getAllBatches,
  getBatchById,
};