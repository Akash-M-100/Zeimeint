'use strict';

const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  instructorIdParam,
  createInstructorValidator,
  updateInstructorValidator,
  adminIdParam,
  createAdminValidator,
  courseIdParam,
} = require('../validators/admin.validator');

const router = express.Router();

// Every /admin route requires a valid JWT belonging to an admin.
router.use(protect, isAdmin);

router.get('/students', adminController.getStudents);
router.get('/stats', adminController.getStats);
router.get('/payments', adminController.getPayments);

// Slice 16: students enrolled in a specific course — drives the attendee
// picker in the meeting-series admin form. Kept under /admin/* because
// it surfaces a roster that only admins should see.
router.get(
  '/courses/:courseId/students',
  courseIdParam,
  validate,
  adminController.getStudentsInCourse,
);

/* ---------------- Instructor account management (admin only) ---------------- */
router.get('/instructors', adminController.getInstructors);
router.post(
  '/instructors',
  createInstructorValidator,
  validate,
  adminController.createInstructor,
);
router.patch(
  '/instructors/:id',
  updateInstructorValidator,
  validate,
  adminController.updateInstructor,
);
router.delete(
  '/instructors/:id',
  instructorIdParam,
  validate,
  adminController.deleteInstructor,
);

/* ---------------- Admin account management (admin only) ---------------- */
// Distinct from POST /api/auth/admin/register (bootstrap-from-zero, gated by
// a shared secret). These let an existing admin manage other admins through
// the panel without needing the bootstrap secret.
router.get('/admins', adminController.listAdmins);
router.post(
  '/admins',
  createAdminValidator,
  validate,
  adminController.createAdmin,
);
router.delete(
  '/admins/:userId',
  adminIdParam,
  validate,
  adminController.revokeAdmin,
);

module.exports = router;
