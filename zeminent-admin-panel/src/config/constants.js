// Centralized app configuration & API endpoint map.
// The backend (NestJS) lives in a separate repository — adjust ENDPOINTS
// here if the backend route names differ.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:7002/api";

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME || "Zeminent LMS";

// Per-role display label shown in each panel's sidebar and on the login screen.
export const PANEL_NAMES = {
  admin: "Admin Panel",
  instructor: "Instructor Panel",
};

export const STORAGE_KEYS = {
  // Shared by both panels (admin + instructor). The signed-in user's `role`
  // determines which panel they may access.
  TOKEN: "zlms_token",
  USER: "zlms_user",
  THEME: "zlms_theme",
};

// Where each role lands after login / where its panel lives.
export const ROLE_HOME = {
  admin: "/admin/dashboard",
  instructor: "/instructor/dashboard",
};

export const COURSE_CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "DevOps & Cloud",
  "Cyber Security",
  "UI/UX Design",
  "Business",
  "Other",
];

export const ENDPOINTS = {
  auth: {
    adminLogin: "/auth/admin/login",
    instructorLogin: "/auth/instructor/login",
    me: "/auth/me",
  },
  courses: {
    list: "/courses",
    detail: (id) => `/courses/${id}`,
    create: "/courses",
    update: (id) => `/courses/${id}`,
    remove: (id) => `/courses/${id}`,
    publish: (id) => `/courses/${id}/publish`,
  },
  lectures: {
    listByCourse: (courseId) => `/courses/${courseId}/lectures`,
    create: (courseId) => `/courses/${courseId}/lectures`,
    detail: (id) => `/lectures/${id}`,
    update: (id) => `/lectures/${id}`,
    remove: (id) => `/lectures/${id}`,
    presignUpload: "/lectures/presign-upload",
  },
  sections: {
    create: (courseId) => `/courses/${courseId}/sections`,
    reorder: (courseId) => `/courses/${courseId}/sections/reorder`,
    update: (id) => `/sections/${id}`,
    remove: (id) => `/sections/${id}`,
  },
  dpps: {
    create: (sectionId) => `/sections/${sectionId}/dpps`,
    remove: (id) => `/dpps/${id}`,
  },
  codeProblems: {
    create: (sectionId) => `/sections/${sectionId}/code-problems`,
    update: (id) => `/code-problems/${id}`,
    remove: (id) => `/code-problems/${id}`,
  },
  payments: {
    list: "/admin/payments",
  },
  students: {
    list: "/admin/students",
  },
  admin: {
    stats: "/admin/stats",
    // Slice 16.2 backend: students enrolled in a specific course. Used
    // by the meeting-series create form's attendee picker.
    courses: {
      students: (courseId) => `/admin/courses/${courseId}/students`,
    },
  },
  instructors: {
    list: "/admin/instructors",
    create: "/admin/instructors",
    update: (id) => `/admin/instructors/${id}`,
    remove: (id) => `/admin/instructors/${id}`,
  },
  liveClasses: {
    list: "/live-classes",
    detail: (id) => `/live-classes/${id}`,
    create: "/live-classes",
    update: (id) => `/live-classes/${id}`,
    remove: (id) => `/live-classes/${id}`,
  },
  // Slice 14 B.6: backend endpoints for the placement enrollments
  // dashboard + refund console + (legacy) leads list.
  placement: {
    enrollments: "/placement-program/enrollments",
    enrollment: (id) => `/placement-program/enrollments/${id}`,
    refund: "/placement-program/refunds",
    leads: "/placement-program/leads",
    lead: (id) => `/placement-program/leads/${id}`,
  },
  // Admin user management — backend PR #15. Separate from
  // ENDPOINTS.admin which holds the dashboard counters / lists. These
  // are the privileged mutate-other-admins endpoints.
  adminUsers: {
    list: "/admin/admins",
    create: "/admin/admins",
    revoke: (id) => `/admin/admins/${id}`,
  },
  // Slice 16.3 backend: unified meeting scheduling. Series is the
  // parent doc (one row per scheduled series). The legacy
  // ENDPOINTS.liveClasses still serves the per-occurrence list/CRUD
  // surface — these series endpoints sit on top of it.
  meetingSeries: {
    list: "/live-classes/series",
    detail: (id) => `/live-classes/series/${id}`,
    create: "/live-classes/series",
  },
};

export const LIVE_CLASS_CATEGORIES = [
  "General",
  "Frontend · React",
  "Frontend · Patterns",
  "Backend · Node",
  "Backend · Distributed",
  "DevOps & Cloud",
  "Career",
  "Office hours",
  "AMA",
];
