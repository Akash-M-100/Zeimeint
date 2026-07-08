// Display formatting helpers.

export const formatPrice = (amount, currency = "INR") => {
  const n = Number(amount) || 0;
  if (n <= 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
};

export const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const truncate = (text = "", max = 120) =>
  text && text.length > max ? `${text.slice(0, max).trimEnd()}…` : text || "";

export const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "U";

export const formatDuration = (seconds) => {
  const s = Number(seconds);
  if (!s || Number.isNaN(s)) return "";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};

export const pluralize = (count, word) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;
