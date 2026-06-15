// Shared helpers for the training-app sync API (Cloudflare Pages Functions).

const PBKDF2_ITERATIONS = 100000;
const SESSION_TTL = 60 * 60 * 24 * 90; // 90 days in seconds

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function toHex(buf) {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

// Derive a PBKDF2 hash of `password` with the given hex salt.
export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export function newSalt() {
  return randomHex(16);
}

export function newToken() {
  return randomHex(32);
}

// Constant-time-ish string compare to avoid trivial timing leaks.
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Read the session token from the Cookie header.
export function getToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/(?:^|;\s*)sid=([^;]+)/);
  return m ? m[1] : null;
}

export function sessionCookie(token) {
  return `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
}

export function clearCookie() {
  return "sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export const SESSION_TTL_S = SESSION_TTL;

// Resolve the authenticated user from the request. Returns { userId, email } or null.
export async function getUser(request, env) {
  const token = getToken(request);
  if (!token) return null;
  const raw = await env.DATA.get(`session:${token}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
