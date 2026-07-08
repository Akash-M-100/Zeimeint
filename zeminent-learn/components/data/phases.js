import { Code2, Layers, Server } from "lucide-react";

export const PHASES = [
  {
    id: "01",
    title: "Foundations",
    weeks: "Weeks 1 — 4",
    icon: Code2,
    summary:
      "HTML semantics, modern CSS, JavaScript fundamentals. Build the muscle memory that everything else stands on.",
    modules: [
      { week: "01", title: "Semantic HTML & accessibility", hours: "11h", tags: ["recorded", "hands-on"] },
      { week: "02", title: "Modern CSS: Flexbox, Grid, custom properties", hours: "13h", tags: ["recorded", "hands-on"] },
      { week: "03", title: "JavaScript foundations: ES6+, async, DOM", hours: "14h", tags: ["recorded", "reviewed"] },
      { week: "04", title: "fetch, errors, the network", hours: "10h", tags: ["recorded", "hands-on"] },
    ],
    deliverable: "Project — a polished portfolio site, deployed.",
  },
  {
    id: "02",
    title: "The Frontend",
    weeks: "Weeks 5 — 8",
    icon: Layers,
    summary:
      "React, hooks, state, routing, component architecture. The vocabulary of every modern frontend role.",
    modules: [
      { week: "05", title: "React mental model & component design", hours: "12h", tags: ["recorded", "reviewed"] },
      { week: "06", title: "Hooks, state machines, effects", hours: "13h", tags: ["recorded", "hands-on"] },
      { week: "07", title: "Routing, data fetching, suspense", hours: "11h", tags: ["recorded", "hands-on"] },
      { week: "08", title: "Tailwind, design tokens, polish", hours: "12h", tags: ["recorded", "reviewed"] },
    ],
    deliverable: "Project — clone of a real product (Linear-lite or Spotify mini-player).",
  },
  {
    id: "03",
    title: "The Backend & Beyond",
    weeks: "Weeks 9 — 12",
    icon: Server,
    summary:
      "Node, Express, Mongo, auth, deployment. The rest of the stack — and a full app shipped to real users.",
    modules: [
      { week: "09", title: "Node, Express, REST, middleware", hours: "13h", tags: ["recorded", "hands-on"] },
      { week: "10", title: "MongoDB, Mongoose, schema design", hours: "12h", tags: ["recorded", "reviewed"] },
      { week: "11", title: "Auth, JWT, security basics", hours: "11h", tags: ["recorded", "hands-on"] },
      { week: "12", title: "Deployment, CI, code review", hours: "11h", tags: ["recorded", "reviewed"] },
    ],
    deliverable: "Capstone — full-stack MERN app, shipped to production with your name on it.",
  },
];
