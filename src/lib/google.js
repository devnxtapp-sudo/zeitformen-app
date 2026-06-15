// Google Identity Services (GIS) integration. The client ID is injected at
// build time via VITE_GOOGLE_CLIENT_ID; when absent, Google login is disabled
// and callers should hide the button.

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const googleEnabled = !!GOOGLE_CLIENT_ID;

let scriptPromise = null;

function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google-Script konnte nicht laden"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// Render the official "Sign in with Google" button into `el`.
// `onCredential` receives the ID token string. `mode` = 'signin' | 'signup'.
export async function renderGoogleButton(el, onCredential, mode = "signin") {
  if (!googleEnabled || !el) return;
  await loadScript();
  if (!window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => {
      if (resp?.credential) onCredential(resp.credential);
    },
    ux_mode: "popup",
    auto_select: false,
  });

  el.innerHTML = "";
  window.google.accounts.id.renderButton(el, {
    theme: "filled_black",
    size: "large",
    type: "standard",
    shape: "rectangular",
    text: mode === "signup" ? "signup_with" : "signin_with",
    logo_alignment: "left",
    width: 320,
  });
}
