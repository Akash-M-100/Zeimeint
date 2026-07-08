'use strict';

const LiveClassSeries = require('../models/liveClassSeries.model');
const LiveClass = require('../models/liveClass.model');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const { computeOccurrences } = require('./meeting.service');
const { buildInviteICS, buildCancelICS } = require('./ics.service');
const emailService = require('./email.service');

// Slice 16.4: extracted from sendInvitesAsync so cancelSeries +
// liveClass.service.sendRecording can reuse the same attendee-resolution
// logic. Returns [{ name, email }] for every invitee, with enrolled
// students resolved from User.find and external invitees passed through.
const resolveSeriesAttendees = async (series) => {
  const resolved = [];

  if (series.attendees?.enrolledStudents?.length > 0) {
    const students = await User.find({
      _id: { $in: series.attendees.enrolledStudents },
    })
      .select('name email')
      .lean();
    students.forEach((s) => resolved.push({ name: s.name, email: s.email }));
  }

  (series.attendees?.externalInvitees || []).forEach((inv) => {
    resolved.push({ name: inv.name || inv.email, email: inv.email });
  });

  return resolved;
};

/**
 * Slice 16.3: create a series + all its child LiveClass occurrences.
 *
 * Not wrapped in a Mongo transaction — Atlas-free local Mongo dev runs
 * without a replica set, and the failure window is small (series.save()
 * either fully succeeds or doesn't; insertMany() is atomic per-document
 * but not as a group). If insertMany partially fails, the orphaned series
 * stays — operator can either re-create or DELETE the dangling series in
 * 16.4. Documented here so the trade-off is visible.
 *
 * Invite emails are fire-and-forget after the response: a slow SMTP must
 * not delay the admin's 201, and per-recipient failures must not abort
 * the batch (Promise.allSettled inside sendInvitesAsync).
 */
const createSeries = async (input, createdBy) => {
  const occurrenceTemplates = computeOccurrences({
    scheduleMode: input.scheduleMode,
    scheduleConfig: input.scheduleConfig,
  });

  if (occurrenceTemplates.length === 0) {
    throw ApiError.badRequest('Schedule produced zero occurrences');
  }

  const series = new LiveClassSeries({
    title: input.title,
    description: input.description,
    category: input.category,
    thumbnail: input.thumbnail,
    meetingType: input.meetingType,
    instructor: input.instructor,
    course: input.course || null,
    meetingUrl: input.meetingUrl,
    durationMinutes: input.durationMinutes,
    scheduleMode: input.scheduleMode,
    scheduleConfig: input.scheduleConfig,
    attendees: {
      enrolledStudents: input.attendees?.enrolledStudents || [],
      externalInvitees: input.attendees?.externalInvitees || [],
    },
    recordingEnabled: Boolean(input.recordingEnabled),
    isPublished: input.isPublished !== false,
    status: 'active',
    createdBy,
    totalOccurrences: occurrenceTemplates.length,
  });
  await series.save();

  // 16.2 fields (meetingType / seriesId / occurrenceIndex / recordingEnabled)
  // populated on each child so direct queries against the LiveClass collection
  // can filter without joining back to the parent series. Slice 16.4 relaxed
  // description / instructor / category to optional on the LiveClass schema
  // so we no longer need to backfill placeholder strings for internal /
  // other meetings that legitimately leave them blank.
  const occurrenceDocs = occurrenceTemplates.map((t) => ({
    title: series.title,
    description: series.description,
    instructor: series.instructor,
    course: series.course,
    startTime: t.startTime,
    durationMinutes: series.durationMinutes,
    meetingUrl: series.meetingUrl,
    thumbnail: series.thumbnail || '',
    category: series.category,
    isPublished: series.isPublished,
    statusOverride: 'none',
    createdBy,
    meetingType: series.meetingType,
    seriesId: series._id,
    occurrenceIndex: t.occurrenceIndex,
    recordingEnabled: series.recordingEnabled,
  }));
  const createdOccurrences = await LiveClass.insertMany(occurrenceDocs);

  // Detach the invite send from the request lifecycle.
  sendInvitesAsync(series, createdOccurrences).catch((err) => {
    console.error('Failed to send some/all invite emails:', err.message);
  });

  return { series, occurrences: createdOccurrences };
};

/**
 * Resolves attendee identities (delegates to resolveSeriesAttendees),
 * builds one ICS Buffer, then dispatches one email per recipient in
 * parallel. Promise.allSettled so a single bad address (SMTP 5xx, hard
 * bounce) doesn't sink the whole batch.
 */
const sendInvitesAsync = async (series, occurrences) => {
  const resolvedAttendees = await resolveSeriesAttendees(series);

  if (resolvedAttendees.length === 0) {
    console.info(`Series ${series._id} has no attendees — no emails sent`);
    return;
  }

  const icsBuffer = buildInviteICS({ series, occurrences, resolvedAttendees });

  const results = await Promise.allSettled(
    resolvedAttendees.map((a) =>
      emailService.sendMeetingInvite({
        to: a.email,
        name: a.name,
        series,
        occurrences,
        icsBuffer,
      }),
    ),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(
      `${failed.length}/${results.length} invite emails failed for series ${series._id}`,
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`  - ${resolvedAttendees[i]?.email}:`, r.reason?.message);
      }
    });
  } else {
    console.info(
      `${results.length} invite email(s) sent for series "${series.title}"`,
    );
  }
};

const listSeries = async ({ meetingType, status, courseId } = {}) => {
  const filter = {};
  if (meetingType) filter.meetingType = meetingType;
  if (status) filter.status = status;
  if (courseId) filter.course = courseId;

  return LiveClassSeries.find(filter)
    .populate('course', 'title')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();
};

const getSeries = async (seriesId) => {
  const series = await LiveClassSeries.findById(seriesId)
    .populate('course', 'title')
    .populate('createdBy', 'name email')
    .populate('attendees.enrolledStudents', 'name email')
    .lean();
  if (!series) throw ApiError.notFound('Series not found');

  const occurrences = await LiveClass.find({ seriesId })
    .sort({ occurrenceIndex: 1 })
    .lean();

  return { series, occurrences };
};

/**
 * Slice 16.4: update a series + propagate selected fields to FUTURE,
 * non-cancelled occurrences. Past occurrences stay frozen (audit value;
 * an admin editing a series title shouldn't rewrite history).
 *
 * Schedule fields (scheduleMode / scheduleConfig) cannot change — that
 * would require regenerating occurrences and re-sending invites, which
 * is a different operation. Admin should cancel and recreate instead.
 *
 * meetingType is also frozen — changing it would either dump an
 * internal meeting onto the public schedule or yank a live class off it.
 */
const updateSeries = async (seriesId, updates) => {
  const series = await LiveClassSeries.findById(seriesId);
  if (!series) throw ApiError.notFound('Series not found');
  if (series.status === 'cancelled') {
    throw ApiError.badRequest('Cannot update a cancelled series');
  }

  if (updates.scheduleMode !== undefined || updates.scheduleConfig !== undefined) {
    throw ApiError.badRequest(
      'Cannot change schedule on an existing series. Cancel and recreate instead.',
    );
  }

  if (updates.meetingType !== undefined && updates.meetingType !== series.meetingType) {
    throw ApiError.badRequest('Cannot change meetingType on an existing series.');
  }

  const ALLOWED = [
    'title',
    'description',
    'category',
    'thumbnail',
    'instructor',
    'course',
    'meetingUrl',
    'durationMinutes',
    'attendees',
    'recordingEnabled',
    'isPublished',
  ];
  ALLOWED.forEach((key) => {
    if (updates[key] !== undefined) series[key] = updates[key];
  });
  await series.save();

  // Subset of ALLOWED that visibly shows on individual occurrence docs.
  // 'attendees' / 'course' are series-level only — they don't denormalize
  // onto each LiveClass row, so propagating them would be a no-op.
  const PROPAGATE = [
    'title',
    'description',
    'instructor',
    'category',
    'thumbnail',
    'meetingUrl',
    'durationMinutes',
    'recordingEnabled',
    'isPublished',
  ];
  const propagationSet = {};
  PROPAGATE.forEach((key) => {
    if (updates[key] !== undefined) propagationSet[key] = updates[key];
  });

  if (Object.keys(propagationSet).length > 0) {
    await LiveClass.updateMany(
      {
        seriesId: series._id,
        startTime: { $gt: new Date() },
        statusOverride: { $ne: 'cancelled' },
      },
      { $set: propagationSet },
    );
  }

  return series;
};

/**
 * Slice 16.4: cancel an entire series. Marks the series, marks all
 * future occurrences cancelled (past ones stay scheduled for audit),
 * and fires METHOD:CANCEL ICS emails to every attendee. Idempotent at
 * the surface (second call → 409) so accidental double-clicks don't
 * fire duplicate cancellation emails.
 */
const cancelSeries = async (seriesId) => {
  const series = await LiveClassSeries.findById(seriesId);
  if (!series) throw ApiError.notFound('Series not found');
  if (series.status === 'cancelled') {
    throw ApiError.conflict('Series already cancelled');
  }

  series.status = 'cancelled';
  await series.save();

  await LiveClass.updateMany(
    { seriesId: series._id, startTime: { $gt: new Date() } },
    { $set: { statusOverride: 'cancelled' } },
  );

  sendCancellationAsync(series).catch((err) => {
    console.error('Failed to send some/all cancellation emails:', err.message);
  });

  return series;
};

const sendCancellationAsync = async (series) => {
  const resolvedAttendees = await resolveSeriesAttendees(series);
  if (resolvedAttendees.length === 0) {
    console.info(`Series ${series._id} cancellation: no attendees to notify`);
    return;
  }

  // Need the full occurrence list for ICS construction — Gmail / Outlook
  // match by UID, so the cancel ICS must reference every event the
  // original invite created (or the weekly RRULE root).
  const occurrences = await LiveClass.find({ seriesId: series._id })
    .sort({ occurrenceIndex: 1 })
    .lean();

  const icsBuffer = buildCancelICS({ series, occurrences, resolvedAttendees });

  const results = await Promise.allSettled(
    resolvedAttendees.map((a) =>
      emailService.sendMeetingCancellation({
        to: a.email,
        name: a.name,
        series,
        icsBuffer,
      }),
    ),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(
      `${failed.length}/${results.length} cancellation emails failed for series ${series._id}`,
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`  - ${resolvedAttendees[i]?.email}:`, r.reason?.message);
      }
    });
  } else {
    console.info(
      `${results.length} cancellation email(s) sent for series "${series.title}"`,
    );
  }
};

module.exports = {
  createSeries,
  listSeries,
  getSeries,
  updateSeries,
  cancelSeries,
  resolveSeriesAttendees,
};
