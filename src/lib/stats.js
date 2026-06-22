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

// ---- personal records (PRs) -------------------------------------------
// Strength PRs come from the user's own set-log (max weight per exercise).
// Endurance distance PRs come from synced intervals.icu activities (best time
// for a standard distance among activities that essentially ARE that distance).
const PR_DISTANCES = [
  { m: 1000, label: "1 km", tol: 0.08 },
  { m: 5000, label: "5 km", tol: 0.04 },
  { m: 10000, label: "10 km", tol: 0.04 },
  { m: 21097, label: "Halbmarathon", tol: 0.03 },
  { m: 42195, label: "Marathon", tol: 0.03 },
];

function metricNumOf(e, re) {
  for (const [k, v] of Object.entries(e?.metrics ?? {})) {
    if (re.test(k)) {
      const n = Number(String(v).replace(",", ".").replace(/[^\d.]/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}
function fmtDuration(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}
function fmtGap(sec) {
  sec = Math.round(sec);
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")} min` : `${s} sek`;
}
function relAgo(dateStr, today) {
  const days = Math.round((today.getTime() - parseYmd(dateStr).getTime()) / DAY_MS);
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  if (days < 14) return `vor ${days} Tagen`;
  const w = Math.round(days / 7);
  if (w < 9) return `vor ${w} Woche${w === 1 ? "" : "n"}`;
  const mo = Math.round(days / 30);
  return `vor ${mo} Monat${mo === 1 ? "" : "en"}`;
}

// Returns up to `limit` PRs, newest first. Each: { kind, emoji, name, value,
// delta, sub, badge, date }. badge "NEU" if achieved within 21 days, else "PR".
export function personalRecords(goal, todayStr, limit = 6) {
  const log = goal?.log ?? {};
  const recs = [];

  // strength: best top-weight per exercise
  const strength = [];
  for (const name of exerciseNames(goal)) {
    const pts = exerciseProgress(goal, name, "topWeight");
    let best = -Infinity, prev = null, bestDate = null;
    for (const p of pts) {
      if (p.value > best) { prev = best === -Infinity ? null : best; best = p.value; bestDate = p.date; }
    }
    if (best > 0)
      strength.push({
        kind: "strength", emoji: "🏋️", name, date: bestDate,
        value: `${Math.round(best * 10) / 10} kg`,
        delta: prev != null && best > prev ? `↑ ${Math.round((best - prev) * 10) / 10} kg` : null,
      });
  }
  strength.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
  recs.push(...strength.slice(0, 3));

  // endurance: distance best-times — intra-activity best efforts (from synced
  // streams, keyed by exact metres) plus whole-activity matches as fallback.
  const cand = new Map(); // metres -> [{ sec, date }]
  const push = (m, sec, date) => {
    if (!(sec > 0)) return;
    if (!cand.has(m)) cand.set(m, []);
    cand.get(m).push({ sec, date });
  };
  for (const [date, e] of Object.entries(log)) {
    const d = baseDate(date);
    if (e.bestEfforts && typeof e.bestEfforts === "object") {
      for (const dd of PR_DISTANCES) push(dd.m, Number(e.bestEfforts[dd.m]), d);
    }
    const km = metricNumOf(e, /distanz/i);
    const sec = Number(e.durationSec) || (metricNumOf(e, /dauer/i) ?? 0) * 60;
    const t = String(e.actType ?? "").toLowerCase();
    if (km > 0 && sec > 0 && (!t || /run/.test(t))) {
      for (const dd of PR_DISTANCES) {
        if (Math.abs(km * 1000 - dd.m) <= dd.m * dd.tol) push(dd.m, sec, d);
      }
    }
  }
  for (const dd of PR_DISTANCES) {
    const list = (cand.get(dd.m) ?? []).sort((a, b) => a.sec - b.sec);
    if (!list.length) continue;
    recs.push({
      kind: "run", emoji: "🏃", name: dd.label, date: list[0].date,
      value: fmtDuration(list[0].sec),
      delta: list[1] && list[1].sec > list[0].sec ? `↓ ${fmtGap(list[1].sec - list[0].sec)}` : null,
    });
  }

  recs.sort((a, b) => (a.date < b.date ? 1 : -1));
  const today = todayStr ? parseYmd(todayStr) : new Date();
  return recs.slice(0, limit).map((r) => ({
    ...r,
    sub: relAgo(r.date, today),
    badge: (today.getTime() - parseYmd(r.date).getTime()) / DAY_MS <= 21 ? "NEU" : "PR",
  }));
}

// ---- Dashboard helpers -------------------------------------------------

function typeOf(goal, id) {
  return (goal?.types ?? []).find((t) => t.id === id) ?? null;
}

// Per-weekday overview for the dashboard week card + weekplan chips.
// status: "done" | "today" | "planned" | "rest".
export function weekOverview(goal, week = {}, todayKey = null) {
  const days = WEEKDAYS.map(({ key, short }) => {
    const d = goal?.days?.[key] ?? {};
    const t = d.typeId ? typeOf(goal, d.typeId) : null;
    const done = !!goal?.log?.[week[key]];
    const isToday = key === todayKey;
    let status = "rest";
    if (!d.isRest) status = done ? "done" : isToday ? "today" : "planned";
    return {
      key,
      short: short.toUpperCase(),
      label: d.isRest ? "Frei" : t?.label ?? d.title ?? "Training",
      color: t?.color ?? null,
      isRest: !!d.isRest,
      isToday,
      done,
      status,
    };
  });
  const planned = days.filter((d) => !d.isRest).length;
  const done = days.filter((d) => !d.isRest && d.done).length;
  return { days, planned, done, pct: planned ? Math.round((done / planned) * 100) : 0 };
}

const DAY_MS = 86400000;

// Consecutive-day streak (logged sessions). current ends today or yesterday;
// best is the longest run ever. Returns { current, best }.
export function dayStreak(goal, todayStr) {
  const set = new Set(Object.keys(goal?.log ?? {}).map(baseDate));
  if (!set.size) return { current: 0, best: 0 };
  const sorted = [...set].sort();
  let best = 0,
    run = 0,
    prev = null;
  for (const ds of sorted) {
    const d = parseYmd(ds).getTime();
    run = prev != null && d - prev === DAY_MS ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  let cur = 0;
  let d = parseYmd(todayStr);
  if (!set.has(ymd(d))) d = new Date(d.getTime() - DAY_MS); // allow "yesterday"
  while (set.has(ymd(d))) {
    cur++;
    d = new Date(d.getTime() - DAY_MS);
  }
  return { current: cur, best: Math.max(best, cur) };
}

// Best-effort planned minutes for one day: parse meta ("35 min", "1.5 h",
// "60–120 min" → upper bound), else sum interval minutes, else null.
function sessionMinutes(day) {
  const meta = String(day?.meta ?? "");
  const range = meta.match(/(\d+)\s*[–-]\s*(\d+)\s*min/i);
  if (range) return Number(range[2]);
  const one = meta.match(/(\d+)\s*min/i);
  if (one) return Number(one[1]);
  const h = meta.match(/(\d+(?:[.,]\d+)?)\s*h\b/i);
  if (h) return Math.round(Number(h[1].replace(",", ".")) * 60);
  let sum = 0;
  for (const iv of day?.session?.intervals ?? []) {
    if (/min/i.test(iv.amountUnit || "")) sum += (Number(iv.repeat) || 1) * (Number(iv.amount) || 0);
  }
  return sum || null;
}

// Estimated weekly training volume split by type (best-effort; 60 min fallback
// per session with no parseable duration). { hours, segments:[{label,color,pct}] }.
export function weeklyLoad(goal) {
  const byType = new Map();
  let totalMin = 0;
  let estimated = false;
  for (const { key } of WEEKDAYS) {
    const d = goal?.days?.[key];
    if (!d || d.isRest) continue;
    let min = sessionMinutes(d);
    if (min == null) {
      min = 60;
      estimated = true;
    }
    totalMin += min;
    const t = typeOf(goal, d.typeId);
    const id = t?.id ?? "other";
    if (!byType.has(id))
      byType.set(id, { label: t?.label ?? d.title ?? "Training", color: t?.color ?? "#9ca3af", min: 0 });
    byType.get(id).min += min;
  }
  const segments = [...byType.values()].map((s) => ({
    label: s.label,
    color: s.color,
    pct: totalMin ? Math.round((s.min / totalMin) * 100) : 0,
  }));
  return { hours: Math.round((totalMin / 60) * 10) / 10, totalMin, segments, estimated };
}
