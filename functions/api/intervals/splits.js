import { json, getUser } from "../_lib.js";

// GET /api/intervals/splits?id=<activityId>
// Fetches time/distance/heartrate/cadence streams and computes per-kilometre
// splits (pace, Ø HF, HF %, zone, Ø cadence) server-side. Only the small split
// list is returned. Loaded on demand when an activity row is expanded.

function streamData(list, type) {
  const s = Array.isArray(list) ? list.find((x) => x && x.type === type) : null;
  return Array.isArray(s?.data) ? s.data : null;
}

function avgRange(arr, from, to) {
  if (!arr) return null;
  let sum = 0;
  let n = 0;
  for (let i = from; i <= to; i++) {
    const v = Number(arr[i]);
    if (Number.isFinite(v) && v > 0) {
      sum += v;
      n++;
    }
  }
  return n ? sum / n : null;
}

function zoneFromPct(pct) {
  if (pct == null) return null;
  if (pct < 60) return "Z1";
  if (pct < 70) return "Z2";
  if (pct < 80) return "Z3";
  if (pct < 90) return "Z4";
  return "Z5";
}

export async function onRequestGet({ request, env }) {
  const session = await getUser(request, env);
  if (!session) return json({ error: "Nicht angemeldet" }, 401);

  const raw = await env.DATA.get(`user:${session.email}`);
  const iv = raw ? JSON.parse(raw).intervals : null;
  if (!iv || !iv.apiKey) return json({ error: "intervals.icu ist nicht verbunden." }, 400);

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return json({ error: "Aktivitäts-ID fehlt." }, 400);

  const api = `https://intervals.icu/api/v1/activity/${encodeURIComponent(id)}/streams?types=time,distance,heartrate,cadence`;
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

  const time = streamData(list, "time");
  const distRaw = streamData(list, "distance");
  if (!time || !distRaw) return json({ splits: [] });
  const hr = streamData(list, "heartrate");
  const cad = streamData(list, "cadence");

  const n = Math.min(time.length, distRaw.length);
  // distance forced monotonic
  const distance = new Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    let d = Number(distRaw[i]);
    if (!Number.isFinite(d) || d < last) d = last;
    last = d;
    distance[i] = d;
  }

  let maxHr = null;
  if (hr) for (let i = 0; i < n; i++) { const v = Number(hr[i]); if (Number.isFinite(v) && v > maxHr) maxHr = v; }

  // index at each completed kilometre
  const idxAt = [0];
  let nextKm = 1000;
  for (let i = 0; i < n; i++) {
    while (distance[i] >= nextKm) {
      idxAt.push(i);
      nextKm += 1000;
    }
  }

  const splits = [];
  for (let k = 1; k < idxAt.length; k++) {
    const a = idxAt[k - 1];
    const b = idxAt[k];
    const paceSec = Math.round(Number(time[b]) - Number(time[a]));
    const h = avgRange(hr, a + 1, b);
    const c = avgRange(cad, a + 1, b);
    const hfPct = h && maxHr ? Math.round((h / maxHr) * 100) : null;
    if (paceSec > 0)
      splits.push({ km: String(k), paceSec, hf: h ? Math.round(h) : null, hfPct, zone: zoneFromPct(hfPct), cadence: c ? Math.round(c) : null });
  }
  // partial final kilometre
  const lastFull = idxAt[idxAt.length - 1];
  const end = n - 1;
  const leftKm = (distance[end] - distance[lastFull]) / 1000;
  if (leftKm > 0.05) {
    const paceSec = Math.round((Number(time[end]) - Number(time[lastFull])) / leftKm);
    const h = avgRange(hr, lastFull + 1, end);
    const c = avgRange(cad, lastFull + 1, end);
    const hfPct = h && maxHr ? Math.round((h / maxHr) * 100) : null;
    if (paceSec > 0)
      splits.push({ km: (Math.round((distance[end] / 1000) * 100) / 100).toString(), paceSec, hf: h ? Math.round(h) : null, hfPct, zone: zoneFromPct(hfPct), cadence: c ? Math.round(c) : null, partial: true });
  }

  return json({ splits, maxHr });
}
