// Notification feed derived from synced activities: one entry per activity
// imported from intervals.icu. "Seen" ids are persisted per device so the bell
// only lights up (blue) for activities the user hasn't looked at yet.
const KEY = "rxz-seen-acts";

function readSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export const notif = $state({ seen: readSeen() });

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...notif.seen]));
  } catch {
    /* ignore */
  }
}

function typeLabel(t) {
  t = String(t || "").toLowerCase();
  if (/run|lauf/.test(t)) return "Lauf";
  if (/ride|bike|rad|cycl|spin/.test(t)) return "Radfahren";
  if (/swim|schwimm/.test(t)) return "Schwimmen";
  if (/strength|kraft|weight|gym/.test(t)) return "Krafttraining";
  if (/row|ruder/.test(t)) return "Rudern";
  if (/walk|geh|hike|wander/.test(t)) return "Gehen";
  return "Training";
}

function num(e, re) {
  const m = e?.metrics || {};
  for (const k in m) {
    if (re.test(k)) {
      const v = parseFloat(String(m[k]).replace(",", "."));
      if (isFinite(v)) return v;
    }
  }
  return null;
}

function summarize(e) {
  const parts = [];
  const km = num(e, /distanz/i);
  if (km != null && km > 0) parts.push((km < 10 ? km.toFixed(1) : Math.round(km).toString()).replace(".", ",") + " km");
  let sec = Number(e.durationSec) || 0;
  if (!sec) {
    const min = num(e, /dauer/i);
    if (min) sec = min * 60;
  }
  if (sec > 0) parts.push(Math.round(sec / 60) + " min");
  return parts.join(" · ");
}

function dateLabel(d) {
  const [y, mo, da] = String(d).split("-");
  if (!da) return String(d);
  return `${da}.${mo}.${y.slice(2)}`;
}

// Build the notification list from a goal's synced activities (newest first).
export function activityNotifications(goal, limit = 30) {
  const log = goal?.log ?? {};
  const out = [];
  for (const [date, e] of Object.entries(log)) {
    if (!e || !e.actId) continue; // only intervals.icu-synced activities
    const type = e.actType || e.klasse || "";
    const summ = summarize(e);
    out.push({
      id: String(e.actId),
      date,
      type,
      title: `${typeLabel(type)} synchronisiert`,
      sub: summ ? `${dateLabel(date)} · ${summ}` : dateLabel(date),
    });
  }
  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out.slice(0, limit);
}

export function unreadCount(list) {
  return list.filter((n) => !notif.seen.has(n.id)).length;
}

export function markAllSeen(list) {
  let changed = false;
  for (const n of list) {
    if (!notif.seen.has(n.id)) {
      notif.seen.add(n.id);
      changed = true;
    }
  }
  if (changed) {
    notif.seen = new Set(notif.seen);
    persist();
  }
}
