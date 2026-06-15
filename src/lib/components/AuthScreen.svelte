<script>
  import { auth, login, signup, loginWithGoogle } from "../auth.svelte.js";
  import { googleEnabled, renderGoogleButton } from "../google.js";

  let { onclose, dismissable = true } = $props();

  let mode = $state("login"); // 'login' | 'signup'
  let name = $state("");
  let email = $state("");
  let password = $state("");
  let password2 = $state("");
  let showPw = $state(false);
  let showPw2 = $state(false);
  let accepted = $state(false);
  let googleEl;

  function setMode(m) {
    mode = m;
    auth.error = "";
  }

  async function onGoogle(credential) {
    const ok = await loginWithGoogle(credential);
    if (ok) onclose?.();
  }

  // (Re)render the Google button whenever the view changes.
  $effect(() => {
    mode; // track
    if (googleEnabled && (mode === "login" || mode === "signup") && googleEl) {
      renderGoogleButton(
        googleEl,
        onGoogle,
        mode === "signup" ? "signup" : "signin",
      );
    }
  });

  async function submit(e) {
    e.preventDefault();
    if (mode === "signup") {
      if (password !== password2) {
        auth.error = "Passwörter stimmen nicht überein.";
        return;
      }
      if (!accepted) {
        auth.error = "Bitte akzeptiere die AGB und die Datenschutzerklärung.";
        return;
      }
    }
    const ok =
      mode === "login"
        ? await login(email.trim(), password)
        : await signup(email.trim(), password, name.trim());
    if (ok) onclose?.();
  }

  function onOverlayKey(e) {
    if (e.key === "Escape" && dismissable) onclose?.();
  }
</script>

<svelte:window onkeydown={onOverlayKey} />

<div class="auth-overlay">
  {#if dismissable}
    <button class="auth-close" onclick={() => onclose?.()} aria-label="Schließen">
      ✕
    </button>
  {/if}

  <div class="auth-card">
    <div class="auth-logo">
      <img src="/logo-mark.png" alt="rxZone – Entwickelt für Athleten" class="auth-logo-img" />
      <p class="auth-claim">Entwickelt für Athleten</p>
      <p class="auth-subtitle">Dein Weg zur Bestleistung</p>
    </div>

    <div class="auth-view-header">
      <h2 class="auth-view-title">
        {mode === "login" ? "Willkommen" : "Konto erstellen"}
      </h2>
      <p class="auth-view-sub">
        {mode === "login"
          ? "Melde dich mit deinem Konto an."
          : "Mit E-Mail und Passwort registrieren."}
      </p>
    </div>

    <form class="auth-form" onsubmit={submit}>
      {#if mode === "signup"}
        <div class="field">
          <label for="a-name">Name</label>
          <div class="input-icon">
            <svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6.5 8-6.5s8 2.5 8 6.5" />
            </svg>
            <input
              id="a-name"
              type="text"
              autocomplete="name"
              placeholder="Max Mustermann"
              bind:value={name}
            />
          </div>
        </div>
      {/if}

      <div class="field">
        <label for="a-email">E-Mail</label>
        <div class="input-icon">
          <svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
          <input
            id="a-email"
            type="email"
            autocomplete="email"
            placeholder="deine@email.de"
            bind:value={email}
            required
          />
        </div>
      </div>

      <div class="field">
        <label for="a-pass">Passwort</label>
        <div class="input-icon">
          <svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <input
            id="a-pass"
            type={showPw ? "text" : "password"}
            autocomplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            bind:value={password}
            minlength="8"
            required
          />
          <button
            type="button"
            class="pw-eye"
            class:active={showPw}
            onclick={() => (showPw = !showPw)}
            aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
          >
            {#if showPw}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 3l18 18" />
                <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.1 3.9M6.6 6.6A18.4 18.4 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            {/if}
          </button>
        </div>
        {#if mode === "signup"}
          <span class="hint muted">Mindestens 8 Zeichen.</span>
        {/if}
      </div>

      {#if mode === "signup"}
        <div class="field">
          <label for="a-pass2">Passwort bestätigen</label>
          <div class="input-icon">
            <svg class="lead" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              id="a-pass2"
              type={showPw2 ? "text" : "password"}
              autocomplete="new-password"
              placeholder="Passwort wiederholen"
              bind:value={password2}
              minlength="8"
              required
            />
            <button
              type="button"
              class="pw-eye"
              class:active={showPw2}
              onclick={() => (showPw2 = !showPw2)}
              aria-label={showPw2 ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {#if showPw2}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.1 3.9M6.6 6.6A18.4 18.4 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" />
                  <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <label class="agb">
          <input type="checkbox" bind:checked={accepted} />
          <span>
            Ich akzeptiere die
            <a href="/agb" target="_blank" rel="noopener">AGB</a>
            und die
            <a href="/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</a>.
          </span>
        </label>
      {/if}

      {#if auth.error}
        <div class="auth-error">{auth.error}</div>
      {/if}

      <button class="btn btn-primary auth-submit" type="submit" disabled={auth.busy}>
        {auth.busy
          ? "Bitte warten …"
          : mode === "login"
            ? "Anmelden"
            : "Konto erstellen"}
      </button>
    </form>

    {#if googleEnabled}
      <div class="auth-divider"><span>oder</span></div>
      <div class="google-btn-wrap" bind:this={googleEl}></div>
      {#if mode === "signup"}
        <p class="google-note muted">
          Mit Google registrieren — du akzeptierst damit AGB und
          Datenschutzerklärung.
        </p>
      {/if}
    {/if}

    <div class="auth-view-footer">
      {#if mode === "login"}
        Noch kein Konto?
        <button type="button" class="auth-link" onclick={() => setMode("signup")}>
          Jetzt registrieren
        </button>
      {:else}
        Schon ein Konto?
        <button type="button" class="auth-link" onclick={() => setMode("login")}>
          Anmelden
        </button>
      {/if}
    </div>

    {#if dismissable}
      <button class="auth-skip" onclick={() => onclose?.()}>
        Ohne Konto fortfahren
      </button>
    {/if}
  </div>
</div>

<style>
  .auth-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background-color: #06070a;
    background-image: url(/auth-bg.jpg);
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
  }
  .auth-close {
    position: fixed;
    top: 14px;
    right: 16px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 18px;
    padding: 6px 10px;
    z-index: 2;
  }
  .auth-close:hover {
    color: var(--text);
  }
  .auth-card {
    position: relative;
    margin: auto 0;
    width: 100%;
    max-width: 400px;
    padding: 22px 8px;
  }
  .auth-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-bottom: 18px;
  }
  .auth-logo-img {
    width: 168px;
    height: 168px;
    margin-bottom: -34px;
  }
  .auth-claim {
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
    text-align: center;
    letter-spacing: 0.01em;
    margin: 2px 0 0;
  }
  .auth-subtitle {
    font-size: 13.5px;
    color: var(--text-muted);
    text-align: center;
    margin: 0;
  }
  .auth-view-header {
    text-align: center;
    margin-bottom: 22px;
  }
  .auth-view-title {
    font-size: 22px;
    letter-spacing: -0.01em;
  }
  .auth-view-sub {
    font-size: 13.5px;
    color: var(--text-muted);
    margin: 8px 0 0;
  }
  .auth-form .field {
    margin-bottom: 16px;
  }
  .auth-form label {
    text-transform: none;
    letter-spacing: 0;
    font-size: 12.5px;
  }
  .auth-form input {
    padding: 13px 14px;
    border-radius: 10px;
    font-size: 15px;
    background: rgba(0, 0, 0, 0.35);
  }
  .input-icon {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-icon .lead {
    position: absolute;
    left: 13px;
    width: 18px;
    height: 18px;
    color: var(--text-dim);
    pointer-events: none;
  }
  .input-icon input {
    padding-left: 42px;
    width: 100%;
  }
  .input-icon input[type="password"],
  .input-icon input[type="text"] {
    padding-right: 44px;
  }
  .input-icon input[type="email"] {
    padding-right: 14px;
  }
  .pw-eye {
    position: absolute;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-muted);
    padding: 6px;
    opacity: 0.7;
  }
  .pw-eye svg {
    width: 19px;
    height: 19px;
  }
  .pw-eye:hover,
  .pw-eye.active {
    opacity: 1;
    color: var(--text);
  }
  .hint {
    display: block;
    font-size: 11.5px;
    margin-top: 5px;
  }
  .agb {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 2px 0 16px;
    font-size: 13.5px;
    color: var(--text-muted);
    line-height: 1.4;
    cursor: pointer;
  }
  .agb input {
    width: 18px;
    height: 18px;
    margin-top: 1px;
    flex: 0 0 auto;
    accent-color: var(--accent);
  }
  .agb a {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .auth-error {
    background: rgba(229, 72, 77, 0.12);
    border: 1px solid rgba(229, 72, 77, 0.3);
    color: #ff6b6f;
    border-radius: 8px;
    padding: 9px 13px;
    font-size: 13px;
    margin-bottom: 12px;
  }
  .auth-submit {
    width: 100%;
    justify-content: center;
    padding: 13px 20px;
    font-size: 15px;
    margin-top: 2px;
    position: relative;
    overflow: hidden;
    color: #eaffd2;
    font-weight: 700;
    text-shadow: 0 1px 6px rgba(40, 90, 0, 0.5);
    background: linear-gradient(
      135deg,
      rgba(120, 200, 40, 0.22) 0%,
      rgba(150, 215, 50, 0.16) 46%,
      rgba(200, 245, 80, 0.2) 100%
    );
    border: 1px solid rgba(170, 225, 70, 0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.18),
      0 0 16px rgba(150, 210, 40, 0.3),
      0 0 34px rgba(120, 190, 30, 0.15);
    animation: authGlow 3.6s ease-in-out infinite;
  }
  .auth-submit::after {
    content: "";
    position: absolute;
    top: 0;
    left: -60%;
    width: 45%;
    height: 100%;
    background: linear-gradient(
      100deg,
      transparent,
      rgba(255, 255, 255, 0.22),
      transparent
    );
    transform: skewX(-18deg);
    animation: authShimmer 6s ease-in-out infinite;
    pointer-events: none;
  }
  .auth-submit:hover {
    background: linear-gradient(
      135deg,
      rgba(135, 215, 50, 0.32) 0%,
      rgba(165, 230, 60, 0.24) 46%,
      rgba(210, 250, 90, 0.3) 100%
    );
    border-color: rgba(185, 240, 85, 0.7);
  }
  .auth-submit:disabled {
    animation: none;
    opacity: 0.7;
  }
  @keyframes authGlow {
    0%,
    100% {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.18),
        0 0 16px rgba(150, 210, 40, 0.3),
        0 0 34px rgba(120, 190, 30, 0.15);
    }
    50% {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        0 0 19px rgba(160, 218, 50, 0.38),
        0 0 40px rgba(130, 195, 35, 0.18);
    }
  }
  @keyframes authShimmer {
    0% {
      left: -60%;
    }
    55%,
    100% {
      left: 120%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .auth-submit,
    .auth-submit::after {
      animation: none;
    }
  }
  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 22px 0 16px;
    color: var(--text-dim);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .auth-divider::before,
  .auth-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .google-btn-wrap {
    display: flex;
    justify-content: center;
    min-height: 44px;
    color-scheme: light;
  }
  .google-note {
    font-size: 12px;
    text-align: center;
    margin: 12px 0 0;
    line-height: 1.4;
  }
  .auth-view-footer {
    text-align: center;
    font-size: 13.5px;
    color: var(--text-muted);
    margin-top: 24px;
  }
  .auth-link {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 13.5px;
    font-weight: 600;
    margin-left: 4px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .auth-skip {
    display: block;
    margin: 18px auto 0;
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 12.5px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .auth-skip:hover {
    color: var(--text-muted);
  }
</style>
