import { json, getUser } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const session = await getUser(request, env);
  if (!session) return json({ user: null });
  // enrich with profile fields stored on the user record
  let name = null;
  let picture = null;
  let hasPassword = false;
  const raw = await env.DATA.get(`user:${session.email}`);
  // Account was deleted (or never existed) -> treat as logged out.
  if (!raw) return json({ user: null });
  try {
    const rec = JSON.parse(raw);
    name = rec.name ?? null;
    picture = rec.picture ?? null;
    hasPassword = !!rec.hash;
  } catch { /* ignore */ }
  return json({ user: { email: session.email, name, picture, hasPassword } });
}
