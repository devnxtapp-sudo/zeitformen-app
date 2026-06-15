import { json, getUser } from "./_lib.js";

// intervals.icu connection: stores the user's athlete-id + API key on their
// user record (server-side only — the key is never returned to the client).
//
// GET    /api/intervals -> { connected: bool, athleteId }
// PUT    /api/intervals -> body { athleteId, apiKey }  (saves credentials)
// DELETE /api/intervals -> removes the stored credentials

async function loadUser(request, env) {
  const session = await getUser(request, env);
  if (!session) return { error: json({ error: "Nicht angemeldet" }, 401) };
  const key = `user:${session.email}`;
  const raw = await env.DATA.get(key);
  if (!raw) return { error: json({ error: "Konto nicht gefunden" }, 404) };
  return { key, user: JSON.parse(raw) };
}

export async function onRequestGet({ request, env }) {
  const { error, user } = await loadUser(request, env);
  if (error) return error;
  const iv = user.intervals;
  return json({ connected: !!(iv && iv.apiKey), athleteId: iv?.athleteId ?? "" });
}

export async function onRequestPut({ request, env }) {
  const { error, key, user } = await loadUser(request, env);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültige Anfrage" }, 400);
  }

  const athleteId = String(body.athleteId || "").trim().slice(0, 40);
  const apiKey = String(body.apiKey || "").trim().slice(0, 200);
  if (!athleteId || !apiKey) {
    return json({ error: "Athlete-ID und API-Key sind erforderlich." }, 400);
  }

  user.intervals = { athleteId, apiKey };
  await env.DATA.put(key, JSON.stringify(user));
  return json({ connected: true, athleteId });
}

export async function onRequestDelete({ request, env }) {
  const { error, key, user } = await loadUser(request, env);
  if (error) return error;
  delete user.intervals;
  await env.DATA.put(key, JSON.stringify(user));
  return json({ connected: false, athleteId: "" });
}
