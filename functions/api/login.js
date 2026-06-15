import {
  json,
  hashPassword,
  newToken,
  normalizeEmail,
  safeEqual,
  sessionCookie,
  SESSION_TTL_S,
} from "./_lib.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültige Anfrage" }, 400);
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  const raw = await env.DATA.get(`user:${email}`);
  if (!raw) {
    return json({ error: "E-Mail oder Passwort falsch." }, 401);
  }

  const user = JSON.parse(raw);
  const hash = await hashPassword(password, user.salt);
  if (!safeEqual(hash, user.hash)) {
    return json({ error: "E-Mail oder Passwort falsch." }, 401);
  }

  const token = newToken();
  await env.DATA.put(
    `session:${token}`,
    JSON.stringify({ userId: user.userId, email: user.email }),
    { expirationTtl: SESSION_TTL_S },
  );

  return json(
    { email: user.email, name: user.name ?? null, picture: user.picture ?? null },
    200,
    { "Set-Cookie": sessionCookie(token) },
  );
}
