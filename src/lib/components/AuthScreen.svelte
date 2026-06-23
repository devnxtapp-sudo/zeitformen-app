<script>
  import { auth, login, signup, loginWithGoogle } from "../auth.svelte.js";
  import { googleEnabled, renderGoogleButton } from "../google.js";
  import User from "@lucide/svelte/icons/user";
  import Mail from "@lucide/svelte/icons/mail";
  import Lock from "@lucide/svelte/icons/lock";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";

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

  $effect(() => {
    mode; // track
    if (googleEnabled && (mode === "login" || mode === "signup") && googleEl) {
      renderGoogleButton(googleEl, onGoogle, mode === "signup" ? "signup" : "signin");
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
    <button class="auth-close" onclick={() => onclose?.()} aria-label="Schließen">✕</button>
  {/if}

  <div class="auth-card">
    <div class="auth-brand">
      <img class="auth-logo" src="/logo.png" alt="rxZone" />
      <div class="auth-tag">Entwickelt für Athleten</div>
    </div>

    <h2 class="auth-title">{mode === "login" ? "Willkommen zurück" : "Konto erstellen"}</h2>
    <p class="auth-sub">
      {mode === "login" ? "Melde dich mit deinem Konto an." : "Mit E-Mail und Passwort registrieren."}
    </p>

    <form onsubmit={submit}>
      {#if mode === "signup"}
        <div class="field">
          <label for="a-name">Name</label>
          <div class="ipt">
            <User size={17} class="ipt-icon" />
            <input id="a-name" class="ipt-input" type="text" autocomplete="name" placeholder="Max Mustermann" bind:value={name} />
          </div>
        </div>
      {/if}

      <div class="field">
        <label for="a-email">E-Mail</label>
        <div class="ipt">
          <Mail size={17} class="ipt-icon" />
          <input id="a-email" class="ipt-input" type="email" autocomplete="email" placeholder="deine@email.de" bind:value={email} required />
        </div>
      </div>

      <div class="field">
        <label for="a-pass">Passwort</label>
        <div class="ipt">
          <Lock size={17} class="ipt-icon" />
          <input
            id="a-pass"
            class="ipt-input has-toggle"
            type={showPw ? "text" : "password"}
            autocomplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            bind:value={password}
            minlength="8"
            required
          />
          <button type="button" class="pw-toggle" onclick={() => (showPw = !showPw)} aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}>
            {#if showPw}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
          </button>
        </div>
        {#if mode === "signup"}<p class="hint">Mindestens 8 Zeichen.</p>{/if}
      </div>

      {#if mode === "signup"}
        <div class="field">
          <label for="a-pass2">Passwort bestätigen</label>
          <div class="ipt">
            <Lock size={17} class="ipt-icon" />
            <input
              id="a-pass2"
              class="ipt-input has-toggle"
              type={showPw2 ? "text" : "password"}
              autocomplete="new-password"
              placeholder="Passwort wiederholen"
              bind:value={password2}
              minlength="8"
              required
            />
            <button type="button" class="pw-toggle" onclick={() => (showPw2 = !showPw2)} aria-label={showPw2 ? "Passwort verbergen" : "Passwort anzeigen"}>
              {#if showPw2}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
            </button>
          </div>
        </div>

        <label class="agb">
          <input type="checkbox" class="agb-box" bind:checked={accepted} />
          <span>
            Ich akzeptiere die
            <a href="/agb" target="_blank" rel="noopener">AGB</a>
            und die
            <a href="/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</a>.
          </span>
        </label>
      {/if}

      {#if auth.error}<div class="auth-err">{auth.error}</div>{/if}

      <button class="auth-submit" type="submit" disabled={auth.busy}>
        {auth.busy ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Konto erstellen"}
      </button>
    </form>

    {#if googleEnabled}
      <div class="auth-divider"><span>oder</span></div>
      <div class="google-wrap" bind:this={googleEl}></div>
      {#if mode === "signup"}
        <p class="hint center">Mit Google registrieren — du akzeptierst damit AGB und Datenschutzerklärung.</p>
      {/if}
    {/if}

    <div class="auth-switch">
      {#if mode === "login"}
        Noch kein Konto?
        <button type="button" onclick={() => setMode("signup")}>Jetzt registrieren</button>
      {:else}
        Schon ein Konto?
        <button type="button" onclick={() => setMode("login")}>Anmelden</button>
      {/if}
    </div>

    {#if dismissable}
      <button class="auth-skip" onclick={() => onclose?.()}>Ohne Konto fortfahren</button>
    {/if}
  </div>
</div>

<style>
  .auth-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: 24px;
    background: var(--bg);
  }
  .auth-close {
    position: fixed;
    right: 16px;
    top: 14px;
    z-index: 2;
    padding: 6px 10px;
    font-size: 18px;
    color: var(--text-muted);
    background: none;
    border: none;
  }
  .auth-close:hover { color: var(--text); }

  .auth-card {
    margin: auto;
    width: 100%;
    max-width: 400px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow);
    padding: 28px 26px 24px;
  }

  .auth-brand { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 18px; }
  .auth-logo { width: 48px; height: 48px; border-radius: 12px; }
  .auth-tag { font-size: 12.5px; font-weight: 600; color: var(--accent); margin-top: 6px; }

  .auth-title { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; color: var(--text); text-align: center; }
  .auth-sub { margin-top: 4px; margin-bottom: 20px; font-size: 13.5px; color: var(--text-muted); text-align: center; }

  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .field label { font-size: 12.5px; font-weight: 600; color: var(--text-muted); }
  .ipt { position: relative; display: flex; align-items: center; }
  .ipt :global(.ipt-icon) { position: absolute; left: 12px; color: var(--text-dim); pointer-events: none; }
  .ipt-input {
    width: 100%;
    background: var(--bg-elev);
    border: 1px solid var(--border-strong);
    color: var(--text);
    border-radius: var(--radius-sm);
    padding: 11px 12px 11px 38px;
    font-size: 15px;
    font-family: inherit;
  }
  .ipt-input.has-toggle { padding-right: 42px; }
  .ipt-input:focus { outline: none; border-color: var(--accent); }
  .ipt-input::placeholder { color: var(--text-dim); }
  .pw-toggle {
    position: absolute;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    background: none;
    border: none;
    color: var(--text-muted);
  }
  .pw-toggle:hover { color: var(--text); }

  .hint { font-size: 11.5px; color: var(--text-muted); margin-top: 6px; }
  .hint.center { text-align: center; }

  .agb { display: flex; align-items: flex-start; gap: 10px; margin: 2px 0 14px; font-size: 13px; line-height: 1.4; color: var(--text-muted); cursor: pointer; }
  .agb-box { width: 16px; height: 16px; flex: none; margin-top: 1px; accent-color: var(--accent); }
  .agb a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }

  .auth-err {
    margin-bottom: 12px;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
    font-size: 13px;
  }

  .auth-submit {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    margin-top: 2px;
    font-size: 15px;
    font-weight: 700;
    color: var(--on-accent);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    box-shadow: 0 3px 16px rgba(var(--accent-rgb), 0.35);
    transition: background 0.12s, transform 0.05s;
  }
  .auth-submit:hover { background: var(--accent-strong); }
  .auth-submit:active { transform: translateY(1px); }
  .auth-submit:disabled { opacity: 0.65; box-shadow: none; }

  .auth-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); }
  .auth-divider::before, .auth-divider::after { content: ""; flex: 1; height: 1px; background: var(--border); }

  .google-wrap { display: flex; justify-content: center; min-height: 44px; color-scheme: light; }

  .auth-switch { margin-top: 22px; text-align: center; font-size: 13.5px; color: var(--text-muted); }
  .auth-switch button { background: none; border: none; margin-left: 4px; font-size: 13.5px; font-weight: 600; color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }

  .auth-skip { display: block; margin: 18px auto 0; background: none; border: none; font-size: 12.5px; color: var(--text-dim); text-decoration: underline; text-underline-offset: 3px; }
  .auth-skip:hover { color: var(--text-muted); }
</style>
