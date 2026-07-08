import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

// Backend wraps every response as { success, message, data }. The other
// services in this folder all unwrap to `data`, so the views never see
// the envelope — matching that here for consistency.
const unwrap = (envelope) => envelope?.data ?? envelope;

// Slice 16.5a: read surface for the meeting-series admin panel. `create`
// is exposed for the upcoming 16.5b scheduling form, but no view calls
// it yet — kept here so the surface area stays in one file.
export const meetingSeriesService = {
  list: async (params = {}) => {
    const { data } = await api.get(ENDPOINTS.meetingSeries.list, { params });
    return unwrap(data);
  },

  get: async (seriesId) => {
    const { data } = await api.get(ENDPOINTS.meetingSeries.detail(seriesId));
    return unwrap(data);
  },

  create: async (payload) => {
    const { data } = await api.post(ENDPOINTS.meetingSeries.create, payload);
    return unwrap(data);
  },

  // Slice 16.5c: edit-series flow. Backend rejects meetingType /
  // scheduleMode / scheduleConfig changes with 400 — the caller is
  // expected to strip those before calling (EditMeetingSeries does so).
  update: async (seriesId, payload) => {
    const { data } = await api.patch(
      ENDPOINTS.meetingSeries.detail(seriesId),
      payload,
    );
    return unwrap(data);
  },

  // Slice 16.5c: cancel a series. Backend marks the series cancelled +
  // flips future occurrences + fires METHOD:CANCEL ICS emails async.
  cancel: async (seriesId) => {
    const { data } = await api.delete(ENDPOINTS.meetingSeries.detail(seriesId));
    return unwrap(data);
  },

  // Slice 16.5c: per-occurrence recording delivery. Lives in this
  // service (alongside the other meeting flows) even though the path
  // is /live-classes/:id rather than /live-classes/series/:id — the
  // admin UI surface is meeting-series-centric.
  sendRecording: async (liveClassId, { recordingUrl, notify = true }) => {
    const { data } = await api.post(
      `/live-classes/${liveClassId}/send-recording`,
      { recordingUrl, notify },
    );
    return unwrap(data);
  },
};
