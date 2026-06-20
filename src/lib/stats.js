import {
  lastNWeekMondays,
  weekDatesFrom,
  ymd,
  parseYmd,
  baseDate,
} from "./dateutil.js";

// Aggregate the completion log of a goal into stats for the StatsView.
export function computeStats(goal, ref = new Date()) {
  const log = goal?.log ?? {};
  const entries = Object.entries(log); // [dateStr, entry]
  const total = entries.length;

  // --- per training type ---
  const byTypeMap = new Map();
  for (const [, e] of entries) {
    const key = e.typeId ?? "_none";
    if (!byTypeMap.has(key)) {
      byTypeMap.set(key, {
        id: key,
        label: e.typeLabel || "Ohne Typ",
        color: e.typeColor || "#9aa0a6",
        count: 0,
      });
    }
    byTypeMap.get(key).count++;
  }
  const byType = [...byTypeMap.values()].sort((a, b) => b.count - a.count);

  // --- last 8 weeks trend ---
  const mondays = lastNWeekMondays(8, ref);
  const weekly = mondays.map((mon) => {
    const dates = new Set(weekDatesFrom(mon));
    let count = 0;
    for (const [d] of entries) if (dates.has(baseDate(d))) count++;
    return { monday: mon, count };
  });

  // --- streak: consecutive weeks (ending current) with >=1 session ---
  let streak = 0;
  for (let i = weekly.length - 1; i >= 0; i--) {
    if (weekly[i].count > 0) streak++;
    else break;
  }

  // --- last 30 days ---
  const cutoff = new Date(ref);
  cutoff.setDate(cutoff.getDate() - 29);
  cutoff.setHours(0, 0, 0, 0);
  let last30 = 0;
  for (const [d] of entries) {
    if (parseYmd(baseDate(d)) >= cutoff) last30++;
  }

  return { total, byType, weekly, streak, last30 };
}

// ---- per-exercise progression ----

// Weekday keys in week order, with German labels (log entries carry `dayKey`).
export const WEEKDAYS = [
  { key: "mo", label: "Montag", short: "Mo" },
  { key: "di", label: "Dienstag", short: "Di" },
  { key: "mi", label: "Mittwoch", short: "Mi" },
  { key: "do", label: "Donnerstag", short: "Do" },
  { key: "fr", label: "Freitag", short: "Fr" },
  { key: "sa", label: "Samstag", short: "Sa" },
  { key: "so", label: "Sonntag", short: "So" },
];

// Weekdays that actually have logged exercise data, in week order Mo→So.
export function loggedDays(goal) {
  const log = goal?.log ?? {};
  const present = new Set();
  for (const e of Object.values(log)) {
    if (!e.dayKey) continue;
    if (e.exercises?.some((ex) => ex.name && ex.sets?.length)) present.add(e.dayKey);
  }
  return WEEKDAYS.filter((d) => present.has(d.key));
}

// Distinct exercise names that have logged sets, sorted by frequency.
// Optionally scoped to a single training day (dayKey "mo".."so").
export function exerciseNames(goal, dayKey = null) {
  const log = goal?.log ?? {};
  const counts = new Map();
  for (const e of Object.values(log)) {
    if (dayKey && e.dayKey !== dayKey) continue;
    for (const ex of e.exercises ?? []) {
      if (!ex.name || !(ex.sets?.length)) continue;
      counts.set(ex.name, (counts.get(ex.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

export const PROGRESS_METRICS = [
  { id: "topWeight", label: "Top-Gewicht", unit: "kg" },
  { id: "volume", label: "Volumen", unit: "" },
  { id: "maxReps", label: "Max Wdh", unit: "" },
  { id: "e1rm", label: "Ø 1RM", unit: "kg" },
];

// Compute one session's value for the chosen metric from its sets.
function sessionValue(sets, metric) {
  if (!sets?.length) return null;
  let best = null;
  let volume = 0;
  for (const s of sets) {
    const reps = Number(s.reps) || 0;
    const weight = Number(s.weight) || 0;
    if (metric === "topWeight") {
      if (s.weight != null) best = Math.max(best ?? 0, weight);
    } else if (metric === "maxReps") {
      if (s.reps != null) best = Math.max(best ?? 0, reps);
    } else if (metric === "volume") {
      // weighted volume if weight present, otherwise count reps
      volume += weight > 0 ? reps * weight : reps;
    } else if (metric === "e1rm") {
      // Epley: weight * (1 + reps/30); only meaningful with weight + reps
      if (weight > 0 && reps > 0) {
        best = Math.max(best ?? 0, weight * (1 + reps / 30));
      }
    }
  }
  if (metric === "volume") return volume > 0 ? volume : null;
  if (best == null) return null;
  return metric === "e1rm" ? Math.round(best) : best;
}

// Time series for an exercise + metric: [{date, value}], oldest first.
// Optionally scoped to a single training day (dayKey "mo".."so").
export function exerciseProgress(goal, name, metric, dayKey = null) {
  const log = goal?.log ?? {};
  const points = [];
  for (const [date, e] of Object.entries(log)) {
    if (dayKey && e.dayKey !== dayKey) continue;
    const ex = (e.exercises ?? []).find((x) => x.name === name);
    if (!ex) continue;
    const value = sessionValue(ex.sets, metric);
    if (value == null) continue;
    points.push({ date: baseDate(date), value });
  }
  points.sort((a, b) => (a.date < b.date ? -1 : 1));
  return points;
}
