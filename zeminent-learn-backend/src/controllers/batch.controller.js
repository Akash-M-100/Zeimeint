'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const batchService = require('../services/batch.service');

const getAllBatches = asyncHandler(async (req, res) => {

    const batches = await batchService.getAllBatches();

    res.status(200).json(
        new ApiResponse(
            200,
            'Batches fetched successfully',
            { batches }
        )
    );

});

const getBatchById = asyncHandler(async (req, res) => {

    const batch = await batchService.getBatchById(
        req.params.batchId
    );

    res.status(200).json(
        new ApiResponse(
            200,
            'Batch fetched successfully',
            { batch }
        )
    );

});

module.exports = {
    getAllBatches,
    getBatchById
};