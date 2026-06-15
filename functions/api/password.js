import {
  json,
  getUser,
  hashPassword,
  newSalt,
  safeEqual,
} from "./_lib.js";

// PUT /api/password  -> change (or set) the account password.
// Body: { currentPassword?: string, newPassword: string }
// For accounts that already have a password, currentPassword must match. For
// Google-only accounts (no hash yet) a password can be set without one.
export async function onRequestPut({ request, env }) {
  const session = await getUser(request, env);
  if (!session) return json({ error: "Nicht angemeldet" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültige Anfrage" }, 400);
  }

  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (newPassword.length < 8) {
    return json({ error: "Neues Passwort muss mindestens 8 Zeichen haben." }, 400);
  }

  const key = `user:${session.email}`;
  const raw = await env.DATA.get(key);
  if (!raw) return json({ error: "Konto nicht gefunden" }, 404);

  const user = JSON.parse(raw);

  // Verify the current password only if one is already set.
  if (user.hash) {
    const check = await hashPassword(currentPassword, user.salt);
    if (!safeEqual(check, user.hash)) {
      return json({ error: "Aktuelles Passwort ist falsch." }, 401);
    }
  }

  const salt = newSalt();
  user.salt = salt;
  user.hash = await hashPassword(newPassword, salt);
  await env.DATA.put(key, JSON.stringify(user));

  return json({ ok: true });
}
