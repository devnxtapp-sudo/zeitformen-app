import {
  json,
  hashPassword,
  newSalt,
  newToken,
  normalizeEmail,
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
  const name = String(body.name || "").trim().slice(0, 80);

  if (!email || !email.includes("@")) {
    return json({ error: "Bitte eine gültige E-Mail angeben." }, 400);
  }
  if (password.length < 8) {
    return json({ error: "Passwort muss mindestens 8 Zeichen haben." }, 400);
  }

  const existing = await env.DATA.get(`user:${email}`);
  if (existing) {
    return json({ error: "Diese E-Mail ist bereits registriert." }, 409);
  }

  const salt = newSalt();
  const hash = await hashPassword(password, salt);
  const userId = crypto.randomUUID();
  const displayName = name || email.split("@")[0];

  await env.DATA.put(
    `user:${email}`,
    JSON.stringify({
      userId,
      email,
      name: displayName,
      salt,
      hash,
      createdAt: Date.now(),
    }),
  );

  const token = newToken();
  await env.DATA.put(`session:${token}`, JSON.stringify({ userId, email }), {
    expirationTtl: SESSION_TTL_S,
  });

  return json({ email, name: displayName, picture: null }, 200, {
    "Set-Cookie": sessionCookie(token),
  });
}
