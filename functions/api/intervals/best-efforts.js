import { json, getUser } from "../_lib.js";

// GET /api/intervals/best-efforts?id=<activityId>
// Fetches the activity's time+distance streams from intervals.icu and computes
// best-effort times (seconds) for standard running distances via a sliding
// window. Only the small result is returned so the large stream payload stays
// server-side.

const TARGETS = [1000, 5000, 10000, 21097, 42195]; // metres

// Minimum time (s) to cover at least D metres anywhere in the activity.
function bestEffort(time, distance, D) {
  const n = Math.min(time.length, distance.length);
  let best = Infinity;
  let i = 0;
  for (let j = 0; j < n; j++) {
    while (i < j && distance[j] - distance[i] >= D) {
      const dt = time[j] - time[i];
      if (dt > 0 && dt < best) best = dt;
      i++;
    }
  }
  return best === Infinity ? null : Math.round(best);
}

function streamData(list, type) {
  const s = Array.isArray(list) ? list.find((x) => x && x.type === type) : null;
  return Array.isArray(s?.data) ? s.data : null;
}

export async function onRequestGet({ request, env }) {
  const session = await getUser(request, env);
  if (!session) return json({ error: "Nicht angemeldet" }, 401);

  const raw = await env.DATA.get(`user:${session.email}`);
  const iv = raw ? JSON.parse(raw).intervals : null;
  if (!iv || !iv.apiKey) return json({ error: "intervals.icu ist nicht verbunden." }, 400);

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return json({ error: "Aktivitäts-ID fehlt." }, 400);

  const api = `https://intervals.icu/api/v1/activity/${encodeURIComponent(id)}/streams?types=time,distance`;
  const auth = "Basic " + btoa(`API_KEY:${iv.apiKey}`);
  let res;
  try {
    res = await fetch(api, { headers: { Authorization: auth } });
  } catch {
    return json({ error: "intervals.icu nicht erreichbar." }, 502);
  }
  if (res.status === 401 || res.status === 403) return json({ error: "API-Key ungültig." }, 401);
  if (!res.ok) return json({ error: `intervals.icu-Fehler (${res.status}).` }, 502);

  let list;
  try {
    list = await res.json();
  } catch {
    return json({ error: "Ungültige Antwort von intervals.icu." }, 502);
  }

  const timeRaw = streamData(list, "time");
  const distRaw = streamData(list, "distance");
  if (!timeRaw || !distRaw) return json({ bestEfforts: {} });

  // Sanitise: finite numbers; distance forced monotonic non-decreasing.
  const n = Math.min(timeRaw.length, distRaw.length);
  const time = new Array(n);
  const distance = new Array(n);
  let lastT = 0;
  let lastD = 0;
  for (let k = 0; k < n; k++) {
    let t = Number(timeRaw[k]);
    if (!Number.isFinite(t)) t = lastT;
    lastT = t;
    time[k] = t;
    let d = Number(distRaw[k]);
    if (!Number.isFinite(d) || d < lastD) d = lastD;
    lastD = d;
    distance[k] = d;
  }

  const total = n ? distance[n - 1] : 0;
  const bestEfforts = {};
  for (const D of TARGETS) {
    if (total < D) continue;
    const sec = bestEffort(time, distance, D);
    if (sec) bestEfforts[D] = sec;
  }
  return json({ bestEfforts });
}
