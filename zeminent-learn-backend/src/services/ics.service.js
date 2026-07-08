'use strict';

// ical-generator v11 ships ESM-style with a `default` export under interop.
// The fallback covers older CJS-only builds, just in case package versions
// drift independently in dev vs CI.
const icalModule = require('ical-generator');
const ical = icalModule.default || icalModule;

const { ASSUMED_TIMEZONE } = require('./meeting.service');

// luxon weekday → ICS BYDAY token. Indexed by our dayOfWeek convention
// (0=Sun..6=Sat), matching the validator + scheduleConfig shape on
// LiveClassSeries.
const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'info@zeminent.com';

/**
 * Slice 16.3: build an ICS Buffer for a meeting series invitation.
 *
 * For weekly mode we emit a single VEVENT with an RRULE — that's the
 * RFC 5545 idiomatic representation and Gmail/Outlook/Apple all render it
 * as a recurring series in the calendar. For manual_dates we emit one
 * VEVENT per occurrence, each with its own UID so updates can target
 * individual sessions later (16.4).
 *
 * @param {object} args
 * @param {object} args.series — LiveClassSeries doc (lean or hydrated)
 * @param {Array<{startTime: Date, occurrenceIndex: number}>} args.occurrences
 * @param {Array<{email: string, name?: string}>} args.resolvedAttendees
 * @returns {Buffer} ICS file content (UTF-8)
 */
const buildInviteICS = ({ series, occurrences, resolvedAttendees }) => {
  const calendar = ical({
    prodId: '-//Zeminent Learning//Meeting Invite//EN',
    method: 'REQUEST',
    timezone: ASSUMED_TIMEZONE,
  });

  const description = buildEventDescription(series);
  const attendees = resolvedAttendees.map((a) => ({
    email: a.email,
    name: a.name || a.email,
    rsvp: true,
  }));
  const organizer = { name: 'Zeminent Learning', email: SUPPORT_EMAIL };

  if (series.scheduleMode === 'weekly') {
    const first = occurrences[0];
    const endTime = new Date(first.startTime.getTime() + series.durationMinutes * 60 * 1000);
    const byDay = ICS_DAYS[series.scheduleConfig.dayOfWeek];

    calendar.createEvent({
      id: `series-${series._id}@learning.zeminent.com`,
      start: first.startTime,
      end: endTime,
      summary: series.title,
      description,
      location: series.meetingUrl,
      url: series.meetingUrl,
      organizer,
      attendees,
      repeating: {
        freq: 'WEEKLY',
        count: occurrences.length,
        byDay: [byDay],
      },
    });
  } else {
    occurrences.forEach((occ) => {
      const endTime = new Date(occ.startTime.getTime() + series.durationMinutes * 60 * 1000);
      calendar.createEvent({
        id: `series-${series._id}-occ-${occ.occurrenceIndex}@learning.zeminent.com`,
        start: occ.startTime,
        end: endTime,
        summary: `${series.title} (Session ${occ.occurrenceIndex} of ${occurrences.length})`,
        description,
        location: series.meetingUrl,
        url: series.meetingUrl,
        organizer,
        attendees,
      });
    });
  }

  return Buffer.from(calendar.toString(), 'utf8');
};

const buildEventDescription = (series) => {
  const lines = [];
  if (series.description) {
    lines.push(series.description, '');
  }
  lines.push(`Meeting link: ${series.meetingUrl}`);
  if (series.recordingEnabled) {
    lines.push('', 'Note: This session will be recorded.');
  }
  return lines.join('\n');
};

/**
 * Slice 16.4: cancellation ICS. Companion to buildInviteICS — uses the
 * SAME UIDs (per-event for manual_dates, single series UID for weekly)
 * so calendar apps can match the cancellation against the original
 * invite and remove the events. SEQUENCE bumped to 1 + STATUS=CANCELLED
 * + METHOD=CANCEL together satisfy RFC 5546 §3.2.5 — Gmail, Outlook,
 * Apple Calendar all honour this.
 */
const buildCancelICS = ({ series, occurrences, resolvedAttendees }) => {
  const calendar = ical({
    prodId: '-//Zeminent Learning//Meeting Cancellation//EN',
    method: 'CANCEL',
    timezone: ASSUMED_TIMEZONE,
  });

  const attendees = resolvedAttendees.map((a) => ({
    email: a.email,
    name: a.name || a.email,
  }));
  const organizer = { name: 'Zeminent Learning', email: SUPPORT_EMAIL };

  if (series.scheduleMode === 'weekly') {
    const first = occurrences[0];
    const endTime = new Date(first.startTime.getTime() + series.durationMinutes * 60 * 1000);
    const byDay = ICS_DAYS[series.scheduleConfig.dayOfWeek];

    calendar.createEvent({
      id: `series-${series._id}@learning.zeminent.com`,
      sequence: 1,
      start: first.startTime,
      end: endTime,
      summary: `CANCELLED: ${series.title}`,
      status: 'CANCELLED',
      organizer,
      attendees,
      repeating: {
        freq: 'WEEKLY',
        count: occurrences.length,
        byDay: [byDay],
      },
    });
  } else {
    occurrences.forEach((occ) => {
      const endTime = new Date(occ.startTime.getTime() + series.durationMinutes * 60 * 1000);
      calendar.createEvent({
        id: `series-${series._id}-occ-${occ.occurrenceIndex}@learning.zeminent.com`,
        sequence: 1,
        start: occ.startTime,
        end: endTime,
        summary: `CANCELLED: ${series.title}`,
        status: 'CANCELLED',
        organizer,
        attendees,
      });
    });
  }

  return Buffer.from(calendar.toString(), 'utf8');
};

module.exports = { buildInviteICS, buildCancelICS };
