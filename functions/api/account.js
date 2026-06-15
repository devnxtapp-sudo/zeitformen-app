import { json, getUser, getToken, clearCookie } from "./_lib.js";

// PUT /api/account  -> update the user's display name.
// Body: { name: string }
export async function onRequestPut({ request, env }) {
  const session = await getUser(request, env);
  if (!session) return json({ error: "Nicht angemeldet" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültige Anfrage" }, 400);
  }

  const name = String(body.name || "").trim().slice(0, 80);
  if (!name) return json({ error: "Bitte einen Namen angeben." }, 400);

  const key = `user:${session.email}`;
  const raw = await env.DATA.get(key);
  if (!raw) return json({ error: "Konto nicht gefunden" }, 404);

  const user = JSON.parse(raw);
  user.name = name;
  await env.DATA.put(key, JSON.stringify(user));

  return json({ email: user.email, name: user.name, picture: user.picture ?? null });
}

// DELETE /api/account -> permanently remove the user, their data snapshot and
// the current session. Irreversible.
export async function onRequestDelete({ request, env }) {
  const session = await getUser(request, env);
  if (!session) return json({ error: "Nicht angemeldet" }, 401);

  await env.DATA.delete(`user:${session.email}`);
  await env.DATA.delete(`data:${session.userId}`);
  const token = getToken(request);
  if (token) await env.DATA.delete(`session:${token}`);

  return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
}
