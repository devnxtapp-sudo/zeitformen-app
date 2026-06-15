import { json, getUser } from "./_lib.js";

// GET  /api/sync       -> { goals, updatedAt } (the stored snapshot, or null)
// PUT  /api/sync       -> stores { goals } with a server timestamp (last-write-wins)
//
// Body for PUT: { goals: [...], baseUpdatedAt?: number }
// If baseUpdatedAt is provided and the server has a newer snapshot, the write is
// rejected with 409 + the current server snapshot, so the client can reconcile.

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Nicht angemeldet" }, 401);

  const raw = await env.DATA.get(`data:${user.userId}`);
  if (!raw) return json({ goals: null, updatedAt: 0 });
  return json(JSON.parse(raw));
}

export async function onRequestPut({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Nicht angemeldet" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültige Anfrage" }, 400);
  }

  if (!Array.isArray(body.goals)) {
    return json({ error: "goals fehlt" }, 400);
  }

  const key = `data:${user.userId}`;
  const existingRaw = await env.DATA.get(key);
  const existing = existingRaw ? JSON.parse(existingRaw) : null;

  // Conflict guard: if the caller based its edit on an older snapshot than what
  // the server holds, reject so the client can pull + merge instead of clobbering.
  if (
    existing &&
    typeof body.baseUpdatedAt === "number" &&
    existing.updatedAt > body.baseUpdatedAt
  ) {
    return json({ conflict: true, ...existing }, 409);
  }

  const snapshot = {
    goals: body.goals,
    measurements: Array.isArray(body.measurements) ? body.measurements : [],
    nutrition:
      body.nutrition && typeof body.nutrition === "object"
        ? body.nutrition
        : null,
    raceNutrition:
      body.raceNutrition && typeof body.raceNutrition === "object"
        ? body.raceNutrition
        : null,
    packlist:
      body.packlist && typeof body.packlist === "object"
        ? body.packlist
        : null,
    updatedAt: Date.now(),
  };
  await env.DATA.put(key, JSON.stringify(snapshot));
  return json({ updatedAt: snapshot.updatedAt });
}
