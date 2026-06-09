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
