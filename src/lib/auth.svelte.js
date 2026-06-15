import { api } from "./api.js";
import {
  pullAndReconcile,
  pushNow,
  setSyncEnabled,
  clearLocal,
} from "./store.svelte.js";

// Shared auth state (Svelte 5 runes).
export const auth = $state({
  user: null, // { email } | null
  checked: false, // true once initial /me has resolved
  busy: false,
  error: "",
});

// Resolve the current session on app start (cookie-based).
export async function checkSession() {
  try {
    const { user } = await api.me();
    auth.user = user;
    if (user) {
      setSyncEnabled(true);
      await pullAndReconcile();
    }
  } catch {
    auth.user = null;
  } finally {
    auth.checked = true;
  }
}

export async function login(email, password) {
  auth.busy = true;
  auth.error = "";
  try {
    const { email: e, name, picture } = await api.login(email, password);
    setSyncEnabled(true);
    await pullAndReconcile();
    auth.user = {
      email: e,
      name: name ?? null,
      picture: picture ?? null,
      hasPassword: true,
    };
    return true;
  } catch (err) {
    auth.error = err.message || "Anmeldung fehlgeschlagen.";
    return false;
  } finally {
    auth.busy = false;
  }
}

export async function signup(email, password, name) {
  auth.busy = true;
  auth.error = "";
  try {
    const { email: e, name: n, picture } = await api.signup(email, password, name);
    auth.user = {
      email: e,
      name: n ?? null,
      picture: picture ?? null,
      hasPassword: true,
    };
    setSyncEnabled(true);
    // brand-new account: push whatever is local up to the server
    await pushNow();
    return true;
  } catch (err) {
    auth.error = err.message || "Registrierung fehlgeschlagen.";
    return false;
  } finally {
    auth.busy = false;
  }
}

export async function loginWithGoogle(credential) {
  auth.busy = true;
  auth.error = "";
  try {
    const { email, name, picture, isNew } = await api.google(credential);
    setSyncEnabled(true);
    // New account: push local data up. Existing: pull + reconcile.
    if (isNew) await pushNow();
    else await pullAndReconcile();
    auth.user = { email, name: name ?? null, picture: picture ?? null };
    return true;
  } catch (err) {
    auth.error = err.message || "Google-Anmeldung fehlgeschlagen.";
    return false;
  } finally {
    auth.busy = false;
  }
}

// Update the display name on the account and in local auth state.
export async function updateName(name) {
  const { name: n } = await api.updateAccount(name);
  if (auth.user) auth.user = { ...auth.user, name: n };
  return n;
}

// Change (or set) the account password. Throws on failure (wrong current pw etc.)
export async function changePassword(currentPassword, newPassword) {
  await api.updatePassword(currentPassword, newPassword);
  if (auth.user) auth.user = { ...auth.user, hasPassword: true };
}

// Permanently delete the account on the server, then wipe local state and reload.
export async function deleteAccount() {
  await api.deleteAccount();
  await clearLocal();
  auth.user = null;
  window.location.reload();
}

export async function logout() {
  try {
    await api.logout();
  } catch {
    /* ignore */
  }
  // Wipe the local cache so the next account on this device starts clean,
  // then reload to reinitialise all in-memory state from scratch.
  await clearLocal();
  auth.user = null;
  window.location.reload();
}
