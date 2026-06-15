import { DAY_KEYS } from "./seed.js";

// Local YYYY-MM-DD (no timezone surprises).
export function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Monday of the week containing `ref` (week starts Monday, like the plan MO–SO).
export function mondayOf(ref = new Date()) {
  const x = new Date(ref);
  const offset = (x.getDay() + 6) % 7; // 0=Mon … 6=Sun
  x.setDate(x.getDate() - offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Map dayKey -> 'YYYY-MM-DD' for the week containing `ref`.
export function weekDates(ref = new Date()) {
  const mon = mondayOf(ref);
  const map = {};
  DAY_KEYS.forEach((k, i) => {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    map[k] = ymd(dt);
  });
  return map;
}

export function todayKey() {
  return ymd(new Date());
}

// ---- log keys ----
// One calendar day can hold more than one training session. The first session
// is keyed by the plain calendar date ('YYYY-MM-DD'); additional sessions get a
// '#n' suffix ('YYYY-MM-DD#1', '#2', …). These helpers keep that convention in
// one place so callers can move between the composite key and its parts.
export function logKey(dateStr, slot = 0) {
  return slot > 0 ? `${dateStr}#${slot}` : dateStr;
}

// Strip any '#n' suffix back to the plain calendar date.
export function baseDate(key) {
  const i = key.indexOf("#");
  return i === -1 ? key : key.slice(0, i);
}

// Session slot encoded in a log key (0 = first/primary session).
export function slotOf(key) {
  const i = key.indexOf("#");
  return i === -1 ? 0 : Number(key.slice(i + 1)) || 0;
}

// 'YYYY-MM-DD' (optionally with '#n' suffix) -> dayKey ('mo'…'so')
export function dayKeyOf(dateStr) {
  const d = new Date(baseDate(dateStr) + "T00:00:00");
  return DAY_KEYS[(d.getDay() + 6) % 7];
}

export function parseYmd(dateStr) {
  return new Date(dateStr + "T00:00:00");
}

// Calendar grid for a month: array of weeks, each 7 entries (Mon–Sun).
// Leading/trailing days from adjacent months are marked outside=true.
export function monthGrid(year, month /* 0-based */) {
  const first = new Date(year, month, 1);
  const start = mondayOf(first);
  const weeks = [];
  let cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) {
      row.push({
        date: ymd(cur),
        day: cur.getDate(),
        outside: cur.getMonth() !== month,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(row);
    // stop early if we've passed the month and completed a week
    if (cur.getMonth() !== month && cur > new Date(year, month + 1, 0)) break;
  }
  return weeks;
}

export const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

// Returns the Monday (YYYY-MM-DD) for each of the last `n` weeks, oldest first.
export function lastNWeekMondays(n, ref = new Date()) {
  const thisMon = mondayOf(ref);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(thisMon);
    m.setDate(thisMon.getDate() - i * 7);
    out.push(ymd(m));
  }
  return out;
}

// All 7 date strings of the week starting at mondayStr.
export function weekDatesFrom(mondayStr) {
  const mon = parseYmd(mondayStr);
  const arr = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    arr.push(ymd(d));
  }
  return arr;
}
