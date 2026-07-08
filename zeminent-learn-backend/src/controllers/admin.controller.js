'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const adminService = require('../services/admin.service');

// GET /api/admin/students — paginated list of student users (admin only)
const getStudents = asyncHandler(async (req, res) => {
  const { students, pagination } = await adminService.listStudents(req.query);
  res.status(200).json(new ApiResponse(200, 'Students fetched', { students, pagination }));
});

// GET /api/admin/stats — dashboard counters: courses, lectures, students, revenue
const getStats = asyncHandler(async (_req, res) => {
  const stats = await adminService.getStats();
  res.status(200).json(new ApiResponse(200, 'Stats fetched', stats));
});

// GET /api/admin/payments — every payment (paginated) for the payments table
const getPayments = asyncHandler(async (req, res) => {
  const { payments, pagination } = await adminService.listPayments(req.query);
  res.status(200).json(new ApiResponse(200, 'Payments fetched', { payments, pagination }));
});

// GET /api/admin/courses/:courseId/students — students enrolled in a course.
// Slice 16: powers the attendee picker in the meeting-series admin form.
const getStudentsInCourse = asyncHandler(async (req, res) => {
  const students = await adminService.listStudentsInCourse(req.params.courseId);
  res.status(200).json(new ApiResponse(200, 'Students fetched', { students }));
});

// GET /api/admin/instructors — paginated list of instructor accounts
const getInstructors = asyncHandler(async (req, res) => {
  const { instructors, pagination } = await adminService.listInstructors(req.query);
  res.status(200).json(new ApiResponse(200, 'Instructors fetched', { instructors, pagination }));
});

// POST /api/admin/instructors — create a new instructor account
const createInstructor = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const instructor = await adminService.createInstructor({ name, email, password });
  res.status(201).json(new ApiResponse(201, 'Instructor created', { instructor }));
});

// PATCH /api/admin/instructors/:id — update an instructor's name/password
const updateInstructor = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const instructor = await adminService.updateInstructor(req.params.id, { name, password });
  res.status(200).json(new ApiResponse(200, 'Instructor updated', { instructor }));
});

// DELETE /api/admin/instructors/:id — remove an instructor account
const deleteInstructor = asyncHandler(async (req, res) => {
  await adminService.deleteInstructor(req.params.id);
  res.status(200).json(new ApiResponse(200, 'Instructor deleted', null));
});

/* ---------------- Admin account management (admin only) -------------------- */

// GET /api/admin/admins — list every admin account
const listAdmins = asyncHandler(async (_req, res) => {
  const admins = await adminService.listAdmins();
  res.status(200).json(new ApiResponse(200, 'Admins fetched', { admins }));
});

// POST /api/admin/admins — current admin creates another admin
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const admin = await adminService.createAdmin({
    name,
    email,
    password,
    createdBy: req.user,
  });
  res.status(201).json(new ApiResponse(201, 'Admin created', { admin }));
});

// DELETE /api/admin/admins/:userId — revoke admin status (demote to student)
const revokeAdmin = asyncHandler(async (req, res) => {
  const admin = await adminService.revokeAdmin({
    userId: req.params.userId,
    requester: req.user,
  });
  res
    .status(200)
    .json(new ApiResponse(200, 'Admin status revoked', { admin }));
});

module.exports = {
  getStudents,
  getStudentsInCourse,
  getStats,
  getPayments,
  getInstructors,
  createInstructor,
  updateInstructor,
  deleteInstructor,
  listAdmins,
  createAdmin,
  revokeAdmin,
};
