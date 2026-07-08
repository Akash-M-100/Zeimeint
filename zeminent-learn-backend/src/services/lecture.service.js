'use strict';

const Course = require('../models/course.model');
const Lecture = require('../models/lecture.model');
const Section = require('../models/section.model');
const Progress = require('../models/progress.model');
const ApiError = require('../utils/ApiError');
const s3Service = require('./s3.service');
const pathService = require('./path.service');
const { fetchYouTubeDuration } = require('../utils/youtube');

// Number of leading lectures every visitor can preview for free.
const FREE_PREVIEW_COUNT = 2;

const getCourseOrFail = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  return course;
};

const getSectionInCourseOrFail = async (sectionId, courseId) => {
  const section = await Section.findById(sectionId);
  if (!section) throw ApiError.notFound('Section not found');
  if (String(section.course) !== String(courseId)) {
    throw ApiError.badRequest('Section does not belong to this course');
  }
  return section;
};

/**
 * Applies access control to a list of lectures for a given viewer.
 *
 * Rules:
 *  - staff (admins + instructors) and users who purchased the course get every
 *    lecture in full
 *  - everyone else gets the first 2 lectures (by `order`) plus any lecture
 *    explicitly flagged `isPreviewFree`
 *  - accessible lectures get a signed playback URL; locked ones get none
 *  - `videoKey` (the internal S3 key) is never exposed to non-staff
 *
 * Async because it signs a playback URL per accessible lecture.
 */
const gateLectures = async (lectures, viewer, course) => {
  // Staff (admins + instructors) manage content, so both get every lecture
  // unlocked and may see the internal S3 key.
  const isStaff = viewer?.role === 'admin' || viewer?.role === 'instructor';
  // Slice 11: lifetime package access. Legacy per-course `hasPurchased` still
  // works as a fallback inside the User method, but new ownership is package-wide.
  const hasFullAccess = viewer ? viewer.hasFullAccessNow() : false;
  const fullAccess = isStaff || hasFullAccess;

  // Fetch all of this viewer's progress for this course in one query. Anonymous
  // viewers skip it — progress fields are simply absent from their response,
  // and the client treats absence as zero.
  let progressByLectureId = new Map();
  if (viewer?._id) {
    const docs = await Progress.find({
      userId: viewer._id,
      courseId: course._id,
    }).lean();
    progressByLectureId = new Map(docs.map((d) => [String(d.lectureId), d]));
  }

  const sorted = [...lectures].sort(
    (a, b) => a.order - b.order || new Date(a.uploadedAt) - new Date(b.uploadedAt),
  );

  return Promise.all(
    sorted.map(async (lecture, index) => {
      const data = typeof lecture.toJSON === 'function' ? lecture.toJSON() : { ...lecture };

      // Backward-compat: legacy docs store metadata nested under `video`. Lift
      // to top-level so the response shape matches new (flat) lectures.
      if (data.video) {
        if (!data.duration) data.duration = Number(data.video.duration) || 0;
        if (!data.size) data.size = Number(data.video.size) || 0;
        if (!data.format) data.format = data.video.format || '';
      }

      const isFreePreview = data.isPreviewFree === true || index < FREE_PREVIEW_COUNT;
      const accessible = fullAccess || isFreePreview;

      // Backward-compat: some lectures store the key flat (data.videoKey),
      // others store it nested (data.video.key). Read from whichever is present.
      const videoKey = data.videoKey || data.video?.key;
      if (!isStaff) {
        delete data.videoKey;
        if (data.video) {
          data.video = { ...data.video };
          delete data.video.key;
        }
      }

      // Attach progress when present (authenticated viewer only). Absence on
      // the response means "no progress recorded yet" — clients default to 0.
      const progress = progressByLectureId.get(String(data._id));
      const progressFields = progress
        ? {
            watchedSeconds: progress.watchedSeconds || 0,
            durationSeconds: progress.durationSeconds || 0,
            completed: Boolean(progress.completed),
            // When the lecture was last touched — lets the player default to the
            // most-recently-watched lecture so a course resumes where you left off.
            progressUpdatedAt: progress.updatedAt || progress.completedAt || null,
          }
        : {};

      // A lecture is either YouTube-hosted (has a youtubeUrl, no S3 asset) or
      // S3-hosted. `videoType` lets the client pick the right player.
      const isYouTube = Boolean(data.youtubeUrl);
      const videoType = isYouTube ? 'youtube' : 's3';

      if (!accessible) {
        // Locked lectures never expose a playable source. For YouTube lectures
        // that means withholding the link itself (the equivalent of not signing
        // an S3 URL) so non-purchasers can't bypass the paywall.
        const locked = { ...data, ...progressFields, videoType, locked: true, freePreview: false };
        delete locked.youtubeUrl;
        return locked;
      }

      // Resolve a playback URL. YouTube lectures expose their watch link
      // directly; S3 lectures get a time-limited signed URL derived from the
      // object key (the key itself is never sent to non-staff). `streamingUrl`
      // is what the admin panel reads; `videoUrl` is the student app — both
      // hold the same URL so existing "has a video" checks keep working.
      const url = isYouTube ? data.youtubeUrl : await s3Service.getSignedAssetUrl(videoKey);
      return {
        ...data,
        ...progressFields,
        videoType,
        videoUrl: url,
        streamingUrl: url,
        locked: false,
        // true when the viewer only sees this because it's a free preview
        freePreview: !fullAccess && isFreePreview,
      };
    }),
  );
};

/**
 * Creates a Lecture from already-uploaded video metadata, linking it to its
 * course (and optionally to a section). The browser uploads the video straight
 * to S3 via a presigned URL, then sends `data.video = { key, duration, size,
 * format }` here — `key` is required.
 */
const createLecture = async (courseId, data) => {
  const course = await getCourseOrFail(courseId);
  const video = data.video;
  const youtubeUrl = (data.youtubeUrl || '').trim();
  if ((!video || !video.key) && !youtubeUrl) {
    throw ApiError.badRequest(
      'A video is required: either upload to S3 and send video.key, or send a youtubeUrl',
    );
  }

  let section = null;
  if (data.sectionId) {
    section = await getSectionInCourseOrFail(data.sectionId, course._id);
  }

  // For YouTube lectures, read the real length server-side from the watch page.
  // Fall back to any client-supplied `duration` (the browser probe) if the
  // fetch fails, so a transient network issue never blocks creation.
  let youtubeDuration = 0;
  if (youtubeUrl) {
    youtubeDuration =
      (await fetchYouTubeDuration(youtubeUrl)) || Math.round(Number(data.duration) || 0);
  }

  const lecture = await Lecture.create({
    title: data.title,
    description: data.description || '',
    // YouTube lectures carry no S3 key; S3 lectures carry no youtubeUrl.
    videoKey: youtubeUrl ? undefined : video.key,
    youtubeUrl: youtubeUrl || '',
    duration: youtubeUrl ? youtubeDuration : Math.round((video && video.duration) || 0),
    size: (video && video.size) || 0,
    format: youtubeUrl ? 'youtube' : (video && video.format) || '',
    order: data.order != null ? data.order : course.lectures.length,
    isPreviewFree: data.isPreviewFree === true,
    course: course._id,
    section: section ? section._id : null,
  });

  course.lectures.push(lecture._id);
  await course.save();

  if (section) {
    section.lectures.push(lecture._id);
    await section.save();
  }

  return lecture;
};

/**
 * Updates lecture metadata, and optionally replaces the video. A new video is
 * signalled by `data.video.key` (the browser already uploaded it to S3). The
 * old S3 object is removed only after the new key is assigned.
 */
const updateLecture = async (lectureId, data) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) throw ApiError.notFound('Lecture not found');

  if (data.video && data.video.key) {
    // New S3 video — replaces whatever the lecture had (S3 or YouTube).
    const previousVideoKey = lecture.videoKey || lecture.video?.key;

    lecture.videoKey = data.video.key;
    lecture.youtubeUrl = '';
    lecture.duration = Math.round(data.video.duration || 0);
    lecture.size = data.video.size || 0;
    lecture.format = data.video.format || '';

    if (previousVideoKey && previousVideoKey !== lecture.videoKey) {
      await s3Service.deleteObject(previousVideoKey);
    }
  } else if (data.youtubeUrl !== undefined && String(data.youtubeUrl).trim()) {
    // Switching to (or updating) a YouTube-hosted lecture. Drop any S3 asset.
    const previousVideoKey = lecture.videoKey || lecture.video?.key;

    lecture.youtubeUrl = String(data.youtubeUrl).trim();
    lecture.videoKey = undefined;
    lecture.format = 'youtube';
    lecture.size = 0;
    // Read the real length server-side from the watch page; fall back to a
    // client-supplied duration, then to the previous value, so a fetch miss
    // never wipes an existing duration.
    const fetched = await fetchYouTubeDuration(lecture.youtubeUrl);
    const fallback = data.duration != null ? Math.round(Number(data.duration) || 0) : 0;
    if (fetched || fallback) {
      lecture.duration = fetched || fallback;
    }

    if (previousVideoKey) {
      await s3Service.deleteObject(previousVideoKey);
    }
  }

  ['title', 'description', 'order', 'isPreviewFree'].forEach((field) => {
    if (data[field] !== undefined) lecture[field] = data[field];
  });

  // Section move: only act when the client explicitly sent the field so a
  // partial update never accidentally unsets it. An empty string or "null"
  // means "remove from any section".
  if (data.sectionId !== undefined) {
    const previousSectionId = lecture.section;
    const wantsNoSection =
      data.sectionId === null || data.sectionId === '' || data.sectionId === 'null';

    if (wantsNoSection) {
      lecture.section = null;
    } else {
      const targetSection = await getSectionInCourseOrFail(data.sectionId, lecture.course);
      lecture.section = targetSection._id;
    }

    if (previousSectionId && String(previousSectionId) !== String(lecture.section || '')) {
      await Section.updateOne(
        { _id: previousSectionId },
        { $pull: { lectures: lecture._id } },
      );
    }
    if (lecture.section && String(previousSectionId || '') !== String(lecture.section)) {
      await Section.updateOne(
        { _id: lecture.section },
        { $addToSet: { lectures: lecture._id } },
      );
    }
  }

  await lecture.save();
  return lecture;
};

/**
 * Deletes a lecture: removes the S3 video, unlinks it from its course
 * (and section, if any), then deletes the document.
 */
const deleteLecture = async (lectureId) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) throw ApiError.notFound('Lecture not found');

  await s3Service.deleteObject(lecture.videoKey || lecture.video?.key);
  await Course.updateOne({ _id: lecture.course }, { $pull: { lectures: lecture._id } });
  if (lecture.section) {
    await Section.updateOne(
      { _id: lecture.section },
      { $pull: { lectures: lecture._id } },
    );
  }
  await lecture.deleteOne();
};

/**
 * Returns every lecture of a course grouped by section, access-gated for the
 * viewer. Lectures with no section are returned as `orphanLectures` (and the
 * client can render them under a synthetic "Course content" group).
 */
const getLecturesForCourse = async (courseId, viewer) => {
  if (!viewer) throw ApiError.unauthorized('Authentication required');
  await pathService.assertCourseUnlockedForUser(courseId, viewer);

  const course = await getCourseOrFail(courseId);
  const [allLectures, sections] = await Promise.all([
    Lecture.find({ course: course._id }),
    Section.find({ course: course._id }).sort({ order: 1, createdAt: 1 }),
  ]);

  // gateLectures sorts internally — and access (free-preview count) is decided
  // against the *flat* order, so we must call it once over all lectures.
  const gatedFlat = await gateLectures(allLectures, viewer, course);
  const gatedById = new Map(gatedFlat.map((l) => [String(l._id), l]));

  const sectionedIds = new Set();
  const groupedSections = sections.map((sec) => {
    const lectureIds = (sec.lectures || []).map(String);
    const lectures = lectureIds
      .map((id) => gatedById.get(id))
      .filter(Boolean)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    lectureIds.forEach((id) => sectionedIds.add(id));
    return {
      _id: sec._id,
      title: sec.title,
      description: sec.description,
      order: sec.order,
      lectures,
    };
  });

  const orphanLectures = gatedFlat.filter((l) => !sectionedIds.has(String(l._id)));

  // Hand back a signed thumbnail URL alongside the lectures so this endpoint's
  // course payload matches what /courses/:id returns.
  const courseData = course.toJSON();
  courseData.thumbnail = await s3Service.getSignedAssetUrl(courseData.thumbnailKey);

  return {
    course: courseData,
    viewerHasFullAccess: viewer ? viewer.hasFullAccessNow() : false,
    sections: groupedSections,
    orphanLectures,
    // legacy flat list for any caller that still reads `lectures`
    lectures: gatedFlat,
  };
};

/**
 * Returns a single lecture for the viewer. Throws 403 if the lecture is locked
 * for them (i.e. a paid lecture they haven't purchased).
 */
const getLectureForUser = async (lectureId, viewer) => {
  if (!viewer) throw ApiError.unauthorized('Authentication required');

  const lecture = await Lecture.findById(lectureId).populate('course');
  if (!lecture || !lecture.course) throw ApiError.notFound('Lecture not found');
  await pathService.assertCourseUnlockedForUser(lecture.course._id, viewer);

  const siblings = await Lecture.find({ course: lecture.course._id });
  const gated = await gateLectures(siblings, viewer, lecture.course);
  const target = gated.find((l) => String(l._id) === String(lectureId));

  if (!target || target.locked) {
    throw ApiError.forbidden('Purchase this course to access this lecture');
  }
  return target;
};

/**
 * Issues a presigned S3 PUT URL for the browser to upload a lecture video
 * directly, plus the object key to send back on create/update.
 */
const presignUpload = ({ filename, contentType }) =>
  s3Service.getPresignedUploadUrl({ filename, contentType });

module.exports = {
  FREE_PREVIEW_COUNT,
  gateLectures,
  createLecture,
  updateLecture,
  deleteLecture,
  getLecturesForCourse,
  getLectureForUser,
  presignUpload,
};
