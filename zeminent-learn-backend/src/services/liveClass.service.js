'use strict';

const LiveClass = require('../models/liveClass.model');
const LiveClassSeries = require('../models/liveClassSeries.model');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');
// Lazy require of liveClassSeries.service inside sendRecording to keep
// the module graph one-directional at top-level (series.service does NOT
// require this file, so we never close a cycle).

/** Creates a live class owned by the given admin/instructor. */
const createLiveClass = async (data, creatorId) => {
  const liveClass = await LiveClass.create({
    title: data.title,
    description: data.description,
    instructor: data.instructor,
    course: data.course || null,
    startTime: data.startTime,
    durationMinutes: data.durationMinutes,
    meetingUrl: data.meetingUrl,
    thumbnail: data.thumbnail || '',
    category: data.category || 'General',
    isPublished: data.isPublished !== false,
    createdBy: creatorId,
  });
  return liveClass;
};

/**
 * Lists live classes with optional status filter ("upcoming" | "live" | "past").
 * Non-admins only see published entries. Slice 16.4: also restricted to
 * meetingType === 'live_class' so internal team meetings and 'other'
 * series spawned through the 16.3 series flow never leak onto the public
 * student-facing schedule. The admin series-list endpoint
 * (/api/live-classes/series) still surfaces every type for admin tooling.
 */
const listLiveClasses = async (query, viewer) => {
  const filter = {};
  const isAdmin = viewer?.role === 'admin';
  if (!isAdmin) {
    filter.isPublished = true;
    filter.meetingType = 'live_class';
  }
  if (query.category) filter.category = query.category;

  const now = new Date();
  if (query.window === 'upcoming') {
    filter.startTime = { $gt: now };
    filter.statusOverride = { $ne: 'cancelled' };
  } else if (query.window === 'past') {
    // ended = now > startTime + duration. Mongo can't express that in a
    // single index query, so we fetch by startTime < now and let the virtual
    // sort it out at the edges.
    filter.startTime = { $lt: now };
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);

  const sort = query.window === 'past' ? { startTime: -1 } : { startTime: 1 };

  const [items, total] = await Promise.all([
    LiveClass.find(filter)
      .populate('createdBy', 'name email')
      .populate('course', 'title category')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    LiveClass.countDocuments(filter),
  ]);

  return {
    liveClasses: items.map((doc) => doc.toJSON()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  };
};

const getLiveClass = async (id, viewer) => {
  const liveClass = await LiveClass.findById(id)
    .populate('createdBy', 'name email')
    .populate('course', 'title category');
  if (!liveClass) throw ApiError.notFound('Live class not found');

  const isAdmin = viewer?.role === 'admin';
  if (!liveClass.isPublished && !isAdmin) throw ApiError.notFound('Live class not found');

  return liveClass.toJSON();
};

const updateLiveClass = async (id, data) => {
  const updatable = [
    'title',
    'description',
    'instructor',
    'course',
    'startTime',
    'durationMinutes',
    'meetingUrl',
    'thumbnail',
    'category',
    'isPublished',
    'statusOverride',
  ];
  const updates = {};
  updatable.forEach((field) => {
    if (data[field] !== undefined) updates[field] = data[field];
  });

  const liveClass = await LiveClass.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
  if (!liveClass) throw ApiError.notFound('Live class not found');
  return liveClass.toJSON();
};

const deleteLiveClass = async (id) => {
  const liveClass = await LiveClass.findById(id);
  if (!liveClass) throw ApiError.notFound('Live class not found');
  await liveClass.deleteOne();
};

/**
 * Slice 16.4: store the recording URL on an occurrence and (by default)
 * notify every attendee on the parent series. notify=false lets the admin
 * upload a URL silently — useful for back-filling old sessions or when
 * the recording needs review before being shared.
 *
 * Standalone occurrences (no seriesId) can still have a URL saved; we
 * just skip the notify branch since there's no attendee list to draw on.
 */
const sendRecording = async ({ liveClassId, recordingUrl, notify = true }) => {
  const occurrence = await LiveClass.findById(liveClassId);
  if (!occurrence) throw ApiError.notFound('Live class not found');

  occurrence.recordingUrl = recordingUrl;
  await occurrence.save();

  if (!notify) {
    return { occurrence, sentCount: 0 };
  }

  if (!occurrence.seriesId) {
    console.warn(
      `Live class ${occurrence._id} has no series — recording stored but no attendees to notify`,
    );
    return { occurrence, sentCount: 0 };
  }

  const series = await LiveClassSeries.findById(occurrence.seriesId);
  if (!series) {
    console.warn(
      `Series ${occurrence.seriesId} not found for occurrence ${occurrence._id}`,
    );
    return { occurrence, sentCount: 0 };
  }

  // Lazy require avoids a potential cycle if liveClassSeries.service ever
  // needs to import from this file later.
  const { resolveSeriesAttendees } = require('./liveClassSeries.service');
  const resolvedAttendees = await resolveSeriesAttendees(series);
  if (resolvedAttendees.length === 0) {
    return { occurrence, sentCount: 0 };
  }

  const results = await Promise.allSettled(
    resolvedAttendees.map((a) =>
      emailService.sendRecordingNotification({
        to: a.email,
        name: a.name,
        series,
        occurrence,
        recordingUrl,
      }),
    ),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(
      `${failed.length}/${results.length} recording emails failed for ${occurrence._id}`,
    );
  } else {
    console.info(
      `${results.length} recording email(s) sent for "${series.title}"`,
    );
  }

  return { occurrence, sentCount: results.length };
};

module.exports = {
  createLiveClass,
  listLiveClasses,
  getLiveClass,
  updateLiveClass,
  deleteLiveClass,
  sendRecording,
};
