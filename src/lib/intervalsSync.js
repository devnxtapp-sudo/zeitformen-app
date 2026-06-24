// Shared intervals.icu activity sync, used by GarminView and by quick-sync
// buttons elsewhere (e.g. the Statistik activities panel). Mirrors the
// syncWeek logic so a connected user can refresh the current week in place.
import { api } from "./api.js";
import { weekDates, dayKeyOf } from "./dateutil.js";
import { updateLogEntry, isCompleted } from "./store.svelte.js";

function metricsFor(a) {
  const m = {};
  if (a.durationMin != null) m["Dauer (min)"] = a.durationMin;
  if (a.distanceKm != null) m["Distanz (km)"] = a.distanceKm;
  if (a.hr != null) m["Puls ø"] = a.hr;
  if (a.watts != null) m["Watt ø"] = a.watts;
  return m;
}

// Build the log-entry patch for a synced activity (metrics + rich detail).
function activityPatch(a) {
  const patch = { metrics: metricsFor(a), note: a.name || "" };
  if (a.id != null) patch.actId = a.id;
  if (a.hrZoneTimes) patch.hrZones = a.hrZoneTimes;
  if (a.type) patch.actType = a.type;
  if (a.durationSec != null) patch.durationSec = a.durationSec;
  const iv = {};
  const extra = { maxHr: a.maxHr, cadence: a.cadence, elevation: a.elevation, load: a.load, trimp: a.trimp, intensity: a.intensity, ctl: a.ctl, atl: a.atl, calories: a.calories };
  for (const [k, v] of Object.entries(extra)) if (v != null) iv[k] = v;
  if (Object.keys(iv).length) patch.iv = iv;
  return patch;
}

// Fetch intra-activity best efforts for runs (optional; ignore failures).
async function addBestEfforts(patch, a) {
  if (a.id && /run/i.test(a.type || "") && a.distanceKm > 0) {
    try {
      const { bestEfforts } = await api.intervalsBestEfforts(a.id);
      if (bestEfforts && Object.keys(bestEfforts).length) patch.bestEfforts = bestEfforts;
    } catch {
      /* best efforts are optional */
    }
  }
}

// Sync this week's planned (non-rest, not-yet-logged) activities from
// intervals.icu. Returns the number imported. Throws on connection/API errors.
export async function syncWeekActivities(goal) {
  if (!goal) throw new Error("Kein aktives Ziel.");
  const week = weekDates();
  const dates = Object.values(week).sort();
  const oldest = dates[0];
  const newest = dates[dates.length - 1];
  const { activities } = await api.intervalsActivities(oldest, newest);
  let imported = 0;
  for (const a of activities || []) {
    if (!a.date || a.date < oldest || a.date > newest) continue;
    const dk = dayKeyOf(a.date);
    const day = goal.days?.[dk];
    if (!day || day.isRest) continue;
    if (isCompleted(goal, a.date)) continue;
    const patch = activityPatch(a);
    await addBestEfforts(patch, a);
    updateLogEntry(goal.id, a.date, patch, dk);
    imported++;
  }
  return imported;
}
