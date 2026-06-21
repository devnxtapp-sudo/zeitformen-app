import { json, getUser } from "../_lib.js";

// GET /api/intervals/activities?oldest=YYYY-MM-DD&newest=YYYY-MM-DD
// Server-side proxy to the intervals.icu API (avoids browser CORS and keeps the
// API key out of the client). Returns a slimmed, normalized activity list.

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Map an intervals.icu activity to the fields the app's log understands.
function normalize(a) {
  const start = String(a.start_date_local || a.start_date || "");
  const seconds = num(a.moving_time) ?? num(a.elapsed_time);
  const distanceM = num(a.distance);
  return {
    id: a.id,
    date: start.slice(0, 10),
    type: a.type || "",
    name: a.name || "",
    durationMin: seconds != null ? Math.round(seconds / 60) : null,
    durationSec: seconds,
    distanceKm: distanceM != null ? Math.round((distanceM / 1000) * 100) / 100 : null,
    hr: num(a.average_heartrate),
    watts: num(a.icu_average_watts ?? a.average_watts),
    // Sekunden je HF-Zone (für die Zonenverteilung in der Statistik)
    hrZoneTimes: Array.isArray(a.icu_hr_zone_times)
      ? a.icu_hr_zone_times.map((s) => num(s) ?? 0)
      : null,
  };
}

export async function onRequestGet({ request, env }) {
  const session = await getUser(request, env);
  if (!session) return json({ error: "Nicht angemeldet" }, 401);

  const raw = await env.DATA.get(`user:${session.email}`);
  const iv = raw ? JSON.parse(raw).intervals : null;
  if (!iv || !iv.apiKey) {
    return json({ error: "intervals.icu ist nicht verbunden." }, 400);
  }

  const url = new URL(request.url);
  const oldest = url.searchParams.get("oldest") || "";
  const newest = url.searchParams.get("newest") || "";

  const api = new URL(`https://intervals.icu/api/v1/athlete/${encodeURIComponent(iv.athleteId)}/activities`);
  if (oldest) api.searchParams.set("oldest", oldest);
  if (newest) api.searchParams.set("newest", newest);

  const auth = "Basic " + btoa(`API_KEY:${iv.apiKey}`);
  let res;
  try {
    res = await fetch(api.toString(), { headers: { Authorization: auth } });
  } catch {
    return json({ error: "intervals.icu nicht erreichbar." }, 502);
  }

  if (res.status === 401 || res.status === 403) {
    return json({ error: "API-Key oder Athlete-ID ungültig." }, 401);
  }
  if (!res.ok) {
    return json({ error: `intervals.icu-Fehler (${res.status}).` }, 502);
  }

  let list;
  try {
    list = await res.json();
  } catch {
    return json({ error: "Ungültige Antwort von intervals.icu." }, 502);
  }

  const activities = Array.isArray(list) ? list.map(normalize) : [];
  return json({ activities });
}
