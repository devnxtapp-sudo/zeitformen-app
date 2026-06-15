import {
  json,
  newToken,
  normalizeEmail,
  sessionCookie,
  SESSION_TTL_S,
} from "./_lib.js";

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

// Verify a Google ID token (credential) via Google's tokeninfo endpoint.
async function verifyGoogleIdToken(idToken, clientId) {
  const res = await fetch(
    `${TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) throw new Error("Google-ID-Token ungültig");
  const data = await res.json();

  if (data.aud !== clientId) throw new Error("Token-Audience stimmt nicht überein");
  if (
    data.iss !== "accounts.google.com" &&
    data.iss !== "https://accounts.google.com"
  ) {
    throw new Error("Token-Issuer ungültig");
  }
  if (data.exp && Number(data.exp) * 1000 < Date.now()) {
    throw new Error("Token abgelaufen");
  }
  if (data.email_verified !== "true" && data.email_verified !== true) {
    throw new Error("Google-E-Mail nicht verifiziert");
  }
  return {
    sub: data.sub,
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

export async function onRequestPost({ request, env }) {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return json({ error: "Google-Login ist nicht konfiguriert." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültige Anfrage" }, 400);
  }
  if (!body.credential) {
    return json({ error: "Google-Token fehlt" }, 400);
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(body.credential, clientId);
  } catch (err) {
    return json(
      { error: "Google-Anmeldung konnte nicht verifiziert werden" },
      401,
    );
  }

  const email = normalizeEmail(profile.email);
  if (!email) return json({ error: "Google-Konto ohne E-Mail" }, 400);

  // Find or create the user, keyed by verified email (links to an existing
  // email/password account too — fine for a personal single-user app).
  let isNew = false;
  const raw = await env.DATA.get(`user:${email}`);
  let user;
  if (raw) {
    user = JSON.parse(raw);
    // keep profile fields fresh on each Google sign-in
    let changed = false;
    if (!user.googleSub) { user.googleSub = profile.sub; changed = true; }
    if (profile.name && user.name !== profile.name) { user.name = profile.name; changed = true; }
    if (profile.picture && user.picture !== profile.picture) { user.picture = profile.picture; changed = true; }
    if (changed) await env.DATA.put(`user:${email}`, JSON.stringify(user));
  } else {
    isNew = true;
    user = {
      userId: crypto.randomUUID(),
      email,
      googleSub: profile.sub,
      name: profile.name || email.split("@")[0],
      picture: profile.picture || null,
      createdAt: Date.now(),
    };
    await env.DATA.put(`user:${email}`, JSON.stringify(user));
  }

  const token = newToken();
  await env.DATA.put(
    `session:${token}`,
    JSON.stringify({ userId: user.userId, email: user.email }),
    { expirationTtl: SESSION_TTL_S },
  );

  return json(
    { email: user.email, name: user.name, picture: user.picture ?? null, isNew },
    200,
    { "Set-Cookie": sessionCookie(token) },
  );
}
