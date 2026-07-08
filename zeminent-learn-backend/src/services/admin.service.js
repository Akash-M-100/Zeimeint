'use strict';

const User = require('../models/user.model');
const Course = require('../models/course.model');
const Lecture = require('../models/lecture.model');
const Section = require('../models/section.model');
const Payment = require('../models/payment.model');
const ApiError = require('../utils/ApiError');

/**
 * Lists student accounts for the admin panel. Mirrors the pagination shape
 * used by listCourses so the frontend can reuse the same table component.
 * Optional `search` does a case-insensitive substring match on name or email.
 */
const listStudents = async (query) => {
  const filter = { role: 'student' };

  if (query.search) {
    const rx = new RegExp(String(query.search).trim(), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  const [students, total] = await Promise.all([
    // toJSON on the user schema strips password+__v, so the array is safe.
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    students,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  };
};

/**
 * Aggregated counters for the admin dashboard. One round-trip per metric, all
 * in parallel — kept simple over a fancier aggregation pipeline so the result
 * is easy to read and reason about.
 */
const getStats = async () => {
  const [
    totalCourses,
    publishedCourses,
    totalLectures,
    totalSections,
    totalStudents,
    revenueAgg,
    paidPaymentsCount,
  ] = await Promise.all([
    Course.countDocuments({}),
    Course.countDocuments({ isPublished: true }),
    Lecture.countDocuments({}),
    Section.countDocuments({}),
    User.countDocuments({ role: 'student' }),
    Payment.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.countDocuments({ paymentStatus: 'paid' }),
  ]);

  // Distinct students who actually own at least one course.
  const enrolledAgg = await User.aggregate([
    { $match: { role: 'student' } },
    { $project: { hasAny: { $gt: [{ $size: { $ifNull: ['$purchasedCourses', []] } }, 0] } } },
    { $match: { hasAny: true } },
    { $count: 'count' },
  ]);

  return {
    totalCourses,
    publishedCourses,
    draftCourses: totalCourses - publishedCourses,
    totalLectures,
    totalSections,
    totalStudents,
    enrolledStudents: enrolledAgg[0]?.count || 0,
    paidPaymentsCount,
    totalRevenue: revenueAgg[0]?.total || 0,
    currency: 'INR',
  };
};

/**
 * Lists every payment for the admin payments table. Populates user + course so
 * the table can render names directly without a second round-trip.
 */
const listPayments = async (query) => {
  const filter = {};
  if (query.status) filter.paymentStatus = query.status;

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('userId', 'name email')
      .populate('courseId', 'title thumbnailKey price category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  };
};

/**
 * Slice 16: students enrolled in a given course. Drives the attendee picker
 * in the admin meeting-series form. Returns lean { _id, name, email } only —
 * the picker doesn't need (and shouldn't ship) the full user doc.
 *
 * Reverse-link is on the User side (`purchasedCourses`); Course has no
 * `enrolledStudents` array, so this is the canonical query path.
 */
const listStudentsInCourse = async (courseId) => {
  return User.find({
    purchasedCourses: courseId,
    role: 'student',
  })
    .select('_id name email')
    .sort({ name: 1 })
    .lean();
};

/* ---------------- Instructor account management (admin only) ---------------- */

/**
 * Lists instructor accounts for the admin panel. Same pagination shape as
 * listStudents so the frontend reuses the same table component. Optional
 * `search` matches name or email (case-insensitive).
 */
const listInstructors = async (query = {}) => {
  const filter = { role: 'instructor' };

  if (query.search) {
    const rx = new RegExp(String(query.search).trim(), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);

  const [instructors, total] = await Promise.all([
    // toJSON strips password + __v, so the array is safe to return.
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    instructors,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  };
};

/**
 * Creates a new instructor account. Email uniqueness is checked up-front for a
 * clean 409; the unique index is the real backstop. Password is hashed by the
 * User model's pre-save hook.
 */
const createInstructor = async ({ name, email, password }) => {
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw ApiError.conflict('Email is already registered');

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: 'instructor',
    // Created by an admin, so treat the address as already trusted.
    isEmailVerified: true,
  });

  return user.toJSON();
};

/**
 * Updates an instructor's name and/or password. Only accounts that are
 * currently instructors can be edited through this admin endpoint.
 */
const updateInstructor = async (instructorId, { name, password }) => {
  const user = await User.findById(instructorId);
  if (!user || user.role !== 'instructor') {
    throw ApiError.notFound('Instructor not found');
  }

  if (name !== undefined) user.name = name;
  if (password !== undefined) user.password = password; // re-hashed by pre-save
  await user.save();

  return user.toJSON();
};

/**
 * Removes an instructor account. Guards against deleting non-instructor users
 * through this endpoint.
 */
const deleteInstructor = async (instructorId) => {
  const user = await User.findById(instructorId);
  if (!user || user.role !== 'instructor') {
    throw ApiError.notFound('Instructor not found');
  }
  await user.deleteOne();
};

/* ---------------- Admin account management (admin only) -------------------- */
// Distinct from POST /api/auth/admin/register (bootstrap-from-zero, gated by
// a shared secret). These functions assume an admin session is already live
// — the controller's protect+isAdmin chain enforces that.

const listAdmins = async () => {
  // toJSON strips password + __v.
  const admins = await User.find({ role: 'admin' }).sort({ createdAt: -1 });
  return admins;
};

/**
 * Creates a new admin account. `createdBy` is the requester's User doc — used
 * only for the audit log line; not persisted on the new user.
 */
const createAdmin = async ({ name, email, password, createdBy }) => {
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw ApiError.conflict('Email is already registered');

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: 'admin',
    // Admin-created account → treat the address as already trusted (same
    // posture as createInstructor above).
    isEmailVerified: true,
  });

  console.info(
    `👮  Admin created: ${user.email} (by ${createdBy?.email || 'unknown'})`,
  );
  return user.toJSON();
};

/**
 * Demotes an admin back to 'student' (lowest privilege). NOT a delete —
 * the user account stays so historical references (Payment.initiatedBy,
 * etc.) keep resolving. Two safeguards:
 *   1. requester cannot revoke themselves — they'd lock themselves out
 *      mid-session
 *   2. at least one admin must remain — otherwise the panel becomes
 *      unrecoverable (only the bootstrap secret could mint a new one)
 *
 * The last-admin check is racy if two admins concurrently revoke each other,
 * but the window is sub-second and the worst-case recovery is the existing
 * /api/auth/admin/register bootstrap path. Acceptable trade-off vs. a
 * heavier transaction.
 */
const revokeAdmin = async ({ userId, requester }) => {
  if (String(userId) === String(requester._id)) {
    throw ApiError.badRequest('Cannot revoke your own admin status');
  }

  const user = await User.findById(userId);
  if (!user || user.role !== 'admin') {
    throw ApiError.notFound('Admin not found');
  }

  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount <= 1) {
    throw ApiError.badRequest('At least one admin must remain');
  }

  user.role = 'student';
  await user.save();

  console.info(
    `👮  Admin revoked: ${user.email} (by ${requester.email})`,
  );
  return user.toJSON();
};

module.exports = {
  listStudents,
  listStudentsInCourse,
  getStats,
  listPayments,
  listInstructors,
  createInstructor,
  updateInstructor,
  deleteInstructor,
  listAdmins,
  createAdmin,
  revokeAdmin,
};
