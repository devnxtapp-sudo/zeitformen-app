// Thin client for the sync/auth API. Cookies (httpOnly session) ride along via
// credentials:"include". All calls are same-origin on the deployed site.

async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api/${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  signup: (email, password, name) =>
    call("signup", { method: "POST", body: { email, password, name } }),
  login: (email, password) =>
    call("login", { method: "POST", body: { email, password } }),
  google: (credential) =>
    call("google", { method: "POST", body: { credential } }),
  logout: () => call("logout", { method: "POST" }),
  me: () => call("me"),
  updateAccount: (name) =>
    call("account", { method: "PUT", body: { name } }),
  deleteAccount: () => call("account", { method: "DELETE" }),
  updatePassword: (currentPassword, newPassword) =>
    call("password", { method: "PUT", body: { currentPassword, newPassword } }),
  syncGet: () => call("sync"),
  syncPut: (goals, measurements, nutrition, raceNutrition) =>
    call("sync", {
      method: "PUT",
      body: { goals, measurements, nutrition, raceNutrition },
    }),
  intervalsStatus: () => call("intervals"),
  intervalsConnect: (athleteId, apiKey) =>
    call("intervals", { method: "PUT", body: { athleteId, apiKey } }),
  intervalsDisconnect: () => call("intervals", { method: "DELETE" }),
  intervalsActivities: (oldest, newest) =>
    call(`intervals/activities?oldest=${encodeURIComponent(oldest)}&newest=${encodeURIComponent(newest)}`),
  intervalsBestEfforts: (id) =>
    call(`intervals/best-efforts?id=${encodeURIComponent(id)}`),
};
