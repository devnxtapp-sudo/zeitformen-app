import { json, getToken, clearCookie } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const token = getToken(request);
  if (token) await env.DATA.delete(`session:${token}`);
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
}
