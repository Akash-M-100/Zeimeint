// Static mock data. Replace these exports with real data sources later.
// Other devs: keep shapes the same so consuming components don't need to change.

export const brand = {
  name: "zeminent",
};

export const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: "grid" },
  { id: "curriculum", label: "Curriculum", href: "/curriculum", icon: "book" },
  { id: "playground", label: "Playground", href: "/playground", icon: "code" },
  { id: "certificate", label: "Certificate", href: "/certificate", icon: "medal" },
  { id: "settings", label: "Settings", href: "/settings", icon: "gear" },
];

export const currentLesson = {
  status: "in progress",
  title: "useEffect, in depth.",
  phase: "Phase 02",
  week: "Week 06",
  lesson: "Lesson 03",
  description:
    "Effects are not lifecycle methods. By the end of this lesson you'll have a model for when to reach for them — and when not to.",
  currentTime: "17:24",
  duration: "28:14",
  progressPercent: 62,
};

export const phases = [
  { id: 1, label: "Phase 01", title: "Foundations", progress: 100 },
  { id: 2, label: "Phase 02", title: "The Frontend", progress: 45 },
  { id: 3, label: "Phase 03", title: "Backend & Beyond", progress: 0 },
];

export const nextMilestone = {
  title: "Complete Week 06 to unlock the Phase 02 capstone brief.",
  meta: "3 lessons left",
};

export const certificate = {
  // Fallback values used when the user has no enrolled-course progress yet.
  // Personalised name / programme / percent are sourced live from useAuth +
  // /api/progress/summary in the consuming pages.
  programme: "Full Stack Web Development",
  hint: "Complete your enrolled course to unlock your verifiable certificate, signed PDF, and shareable LinkedIn link.",
};

export const settingsSections = [
  {
    id: "account",
    title: "Account",
    fields: [
      { label: "Full name", value: "" },
      { label: "Email", value: "" },
      { label: "Display handle", value: "" },
    ],
  },
  {
    id: "learning",
    title: "Learning",
    fields: [
      { label: "Default playback speed", value: "1.0×" },
      { label: "Auto-advance lessons", value: "On" },
      { label: "Show captions", value: "Off" },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    fields: [
      { label: "Weekly recap email", value: "On" },
      { label: "New lesson drops", value: "On" },
      { label: "Cohort discussion replies", value: "Mentions only" },
    ],
  },
];

export function todayLabel() {
  // Hard-coded for static design; replace with real Date logic later.
  return "Thursday, May 7";
}

// ─── Dashboard widgets ──────────────────────────────────────────────────────

export const dailyQuote = {
  body: "Small disciplines repeated with consistency every day lead to great achievements.",
  author: "John C. Maxwell",
};

export const learningStats = {
  streakDays: 14,
  streakRecord: 23,
  focusMinutesToday: 92,
  focusGoalMinutes: 120,
  weeklyGoalPercent: 68,
  xpToday: 340,
  xpDelta: 60,
  cohortOnline: 28,
};

export const todayPlan = [
  {
    id: "p1",
    type: "lesson",
    title: "useEffect, in depth",
    course: "MERN · Phase 02 · Week 06",
    duration: "28 min",
    status: "in_progress",
    progress: 62,
  },
  {
    id: "p2",
    type: "reading",
    title: "Reading: Rules of Hooks",
    course: "React docs · supplementary",
    duration: "10 min",
    status: "todo",
    progress: 0,
  },
  {
    id: "p3",
    type: "practice",
    title: "Practice: build a debounced search",
    course: "Lab · effects & cleanup",
    duration: "35 min",
    status: "todo",
    progress: 0,
  },
  {
    id: "p4",
    type: "assignment",
    title: "Assignment: todo with effects",
    course: "Due tomorrow · 11:59 PM",
    duration: "60 min",
    status: "todo",
    progress: 0,
  },
];

// 12 weeks × 7 days, deterministic intensity so SSR/CSR match.
export const activityHeatmap = (function build() {
  const weeks = 12;
  const days = 7;
  const grid = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < days; d++) {
      // simple deterministic pattern, recent weeks denser.
      const seed = (w * 7 + d * 3) % 11;
      const recencyBoost = w > 7 ? 2 : w > 4 ? 1 : 0;
      const level = Math.min(4, Math.max(0, ((seed + recencyBoost) % 5)));
      col.push(level);
    }
    grid.push(col);
  }
  return grid;
})();

export const upcomingDeadlines = [
  {
    id: "d1",
    title: "Todo with effects",
    kind: "Assignment",
    when: "Tomorrow · 11:59 PM",
    urgency: "high",
  },
  {
    id: "d2",
    title: "React state quiz",
    kind: "Quiz",
    when: "Fri · 5:00 PM",
    urgency: "med",
  },
  {
    id: "d3",
    title: "Pair review · cohort 04",
    kind: "Live session",
    when: "Sat · 10:00 AM",
    urgency: "low",
  },
  {
    id: "d4",
    title: "Phase 02 capstone brief",
    kind: "Capstone",
    when: "Next Wed",
    urgency: "low",
  },
];

