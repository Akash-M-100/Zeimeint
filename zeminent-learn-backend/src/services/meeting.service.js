'use strict';

const { DateTime } = require('luxon');

// Slice 16.3: input timezone is hardcoded to IST. Admins pick weekly times in
// local terms ("Monday 6 PM"), so this prevents the previous setHours()-bug
// where production servers in UTC would emit weekly occurrences at the wrong
// wall-clock time. ICS export + email rendering re-use this constant so the
// invite shows the same IST time the admin entered.
const ASSUMED_TIMEZONE = 'Asia/Kolkata';

/**
 * Slice 16: occurrence expansion. Pure function — no DB writes. Used by the
 * series-create flow to turn a schedule config into the array of LiveClass
 * docs that need to be created. Lives here, separate from
 * liveClass.service.js, so the series controller can call it without pulling
 * the whole CRUD service.
 *
 * Returns: [{ startTime: Date, occurrenceIndex: 1-based }]
 *
 * - manual_dates: one entry per date in scheduleConfig.dates (timestamps used
 *   verbatim — admin can pick any TZ when submitting full ISO strings)
 * - weekly: occurrenceCount entries starting from the first dayOfWeek on or
 *   after startDate, at the given HH:MM IN IST, +7 days per step. We anchor
 *   the cursor IN IST so DST-style shifts in the underlying calendar (none
 *   for IST, but the math is portable) never silently drift the wall-clock.
 */
const computeOccurrences = ({ scheduleMode, scheduleConfig }) => {
  if (scheduleMode === 'manual_dates') {
    if (!scheduleConfig || !Array.isArray(scheduleConfig.dates) || scheduleConfig.dates.length === 0) {
      throw new Error('manual_dates requires non-empty dates array');
    }
    return scheduleConfig.dates.map((d, i) => ({
      startTime: new Date(d),
      occurrenceIndex: i + 1,
    }));
  }

  if (scheduleMode === 'weekly') {
    if (!scheduleConfig) {
      throw new Error('weekly requires scheduleConfig');
    }
    const { startDate, dayOfWeek, time, occurrenceCount } = scheduleConfig;
    if (!startDate || dayOfWeek === undefined || dayOfWeek === null || !time || !occurrenceCount) {
      throw new Error('weekly requires startDate, dayOfWeek, time, occurrenceCount');
    }

    const [hh, mm] = time.split(':').map(Number);

    // luxon: weekday 1=Mon..7=Sun; our dayOfWeek: 0=Sun..6=Sat. Translate.
    const luxonWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;

    let cursor = DateTime.fromJSDate(new Date(startDate))
      .setZone(ASSUMED_TIMEZONE)
      .set({ hour: hh, minute: mm, second: 0, millisecond: 0 });

    while (cursor.weekday !== luxonWeekday) {
      cursor = cursor.plus({ days: 1 });
    }

    const out = [];
    for (let i = 0; i < occurrenceCount; i += 1) {
      out.push({
        startTime: cursor.toJSDate(),
        occurrenceIndex: i + 1,
      });
      cursor = cursor.plus({ weeks: 1 });
    }
    return out;
  }

  throw new Error(`Unknown scheduleMode: ${scheduleMode}`);
};

module.exports = { computeOccurrences, ASSUMED_TIMEZONE };
