<script>
  import { auth, login, signup, loginWithGoogle } from "../auth.svelte.js";
  import { googleEnabled, renderGoogleButton } from "../google.js";
  import { Button, Input, Label, Helper, Checkbox, Alert } from "flowbite-svelte";

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

<div
  class="auth-overlay fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-cover bg-[center_top] bg-no-repeat p-6"
>
  {#if dismissable}
    <button
      class="fixed right-4 top-3.5 z-[2] px-2.5 py-1.5 text-lg text-ink-muted transition-colors hover:text-ink"
      onclick={() => onclose?.()}
      aria-label="Schließen"
    >
      ✕
    </button>
  {/if}

  <div class="relative my-auto w-full max-w-[400px] px-2 py-5.5">
    <div class="mb-4.5 flex flex-col items-center gap-1.5">
      <img
        src="/logo-mark.png"
        alt="rxZone – Entwickelt für Athleten"
        class="-mb-[34px] h-[168px] w-[168px]"
      />
      <p
        class="mt-0.5 text-center text-sm font-semibold tracking-[0.01em] text-primary-500"
      >
        Entwickelt für Athleten
      </p>
      <p class="text-center text-[13.5px] text-ink-muted">
        Dein Weg zur Bestleistung
      </p>
    </div>

    <div class="mb-5.5 text-center">
      <h2 class="text-[22px] font-bold tracking-[-0.01em] text-ink">
        {mode === "login" ? "Willkommen" : "Konto erstellen"}
      </h2>
      <p class="mt-2 text-[13.5px] text-ink-muted">
        {mode === "login"
          ? "Melde dich mit deinem Konto an."
          : "Mit E-Mail und Passwort registrieren."}
      </p>
    </div>

    <form onsubmit={submit}>
      {#if mode === "signup"}
        <div class="mb-4">
          <Label for="a-name" class="mb-1.5 block text-[12.5px] font-normal text-ink-muted">Name</Label>
          <div class="relative flex items-center">
            <svg class="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-ink-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6.5 8-6.5s8 2.5 8 6.5" />
            </svg>
            <Input
              id="a-name"
              type="text"
              autocomplete="name"
              placeholder="Max Mustermann"
              bind:value={name}
              class="w-full bg-black/35 py-3.5 pl-[42px] pr-3.5 text-[15px]"
            />
          </div>
        </div>
      {/if}

      <div class="mb-4">
        <Label for="a-email" class="mb-1.5 block text-[12.5px] font-normal text-ink-muted">E-Mail</Label>
        <div class="relative flex items-center">
          <svg class="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-ink-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
          <Input
            id="a-email"
            type="email"
            autocomplete="email"
            placeholder="deine@email.de"
            bind:value={email}
            required
            class="w-full bg-black/35 py-3.5 pl-[42px] pr-3.5 text-[15px]"
          />
        </div>
      </div>

      <div class="mb-4">
        <Label for="a-pass" class="mb-1.5 block text-[12.5px] font-normal text-ink-muted">Passwort</Label>
        <div class="relative flex items-center">
          <svg class="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-ink-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <Input
            id="a-pass"
            type={showPw ? "text" : "password"}
            autocomplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            bind:value={password}
            minlength="8"
            required
            class="w-full bg-black/35 py-3.5 pl-[42px] pr-11 text-[15px]"
          />
          <button
            type="button"
            class="absolute right-2 flex items-center justify-center p-1.5 transition-opacity {showPw ? 'text-ink opacity-100' : 'text-ink-muted opacity-70'} hover:text-ink hover:opacity-100"
            onclick={() => (showPw = !showPw)}
            aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
          >
            {#if showPw}
              <svg class="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 3l18 18" />
                <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.1 3.9M6.6 6.6A18.4 18.4 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </svg>
            {:else}
              <svg class="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            {/if}
          </button>
        </div>
        {#if mode === "signup"}
          <Helper class="mt-1.5 text-[11.5px] text-ink-muted">Mindestens 8 Zeichen.</Helper>
        {/if}
      </div>

      {#if mode === "signup"}
        <div class="mb-4">
          <Label for="a-pass2" class="mb-1.5 block text-[12.5px] font-normal text-ink-muted">Passwort bestätigen</Label>
          <div class="relative flex items-center">
            <svg class="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-ink-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <Input
              id="a-pass2"
              type={showPw2 ? "text" : "password"}
              autocomplete="new-password"
              placeholder="Passwort wiederholen"
              bind:value={password2}
              minlength="8"
              required
              class="w-full bg-black/35 py-3.5 pl-[42px] pr-11 text-[15px]"
            />
            <button
              type="button"
              class="absolute right-2 flex items-center justify-center p-1.5 transition-opacity {showPw2 ? 'text-ink opacity-100' : 'text-ink-muted opacity-70'} hover:text-ink hover:opacity-100"
              onclick={() => (showPw2 = !showPw2)}
              aria-label={showPw2 ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {#if showPw2}
                <svg class="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.1 3.9M6.6 6.6A18.4 18.4 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" />
                  <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                </svg>
              {:else}
                <svg class="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <label class="mb-4 mt-0.5 flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-[1.4] text-ink-muted">
          <Checkbox bind:checked={accepted} class="mt-px shrink-0" />
          <span>
            Ich akzeptiere die
            <a href="/agb" target="_blank" rel="noopener" class="text-primary-500 underline underline-offset-2">AGB</a>
            und die
            <a href="/datenschutz" target="_blank" rel="noopener" class="text-primary-500 underline underline-offset-2">Datenschutzerklärung</a>.
          </span>
        </label>
      {/if}

      {#if auth.error}
        <Alert color="red" class="mb-3 border border-[rgba(229,72,77,0.3)] bg-[rgba(229,72,77,0.12)] px-3.5 py-2.5 text-[13px] text-[#ff6b6f]">
          {auth.error}
        </Alert>
      {/if}

      <button class="auth-submit" type="submit" disabled={auth.busy}>
        {auth.busy
          ? "Bitte warten …"
          : mode === "login"
            ? "Anmelden"
            : "Konto erstellen"}
      </button>
    </form>

    {#if googleEnabled}
      <div class="auth-divider my-[22px] mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.08em] text-ink-dim">
        <span>oder</span>
      </div>
      <div class="flex min-h-[44px] justify-center [color-scheme:light]" bind:this={googleEl}></div>
      {#if mode === "signup"}
        <p class="mt-3 text-center text-xs leading-[1.4] text-ink-muted">
          Mit Google registrieren — du akzeptierst damit AGB und
          Datenschutzerklärung.
        </p>
      {/if}
    {/if}

    <div class="mt-6 text-center text-[13.5px] text-ink-muted">
      {#if mode === "login"}
        Noch kein Konto?
        <button type="button" class="ml-1 text-[13.5px] font-semibold text-primary-500 underline underline-offset-[3px]" onclick={() => setMode("signup")}>
          Jetzt registrieren
        </button>
      {:else}
        Schon ein Konto?
        <button type="button" class="ml-1 text-[13.5px] font-semibold text-primary-500 underline underline-offset-[3px]" onclick={() => setMode("login")}>
          Anmelden
        </button>
      {/if}
    </div>

    {#if dismissable}
      <button class="mx-auto mt-4.5 block text-[12.5px] text-ink-dim underline underline-offset-[3px] transition-colors hover:text-ink-muted" onclick={() => onclose?.()}>
        Ohne Konto fortfahren
      </button>
    {/if}
  </div>
</div>

<style>
  .auth-overlay {
    background-color: #06070a;
    background-image: url(/auth-bg.jpg);
  }
  /* Bespoke animated neon-green submit button — kept as scoped CSS because the
     dual keyframe glow + shimmer sweep + layered gradients can't be expressed
     with utilities. Behavior (type/disabled) lives on the element above. */
  .auth-submit {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    padding: 13px 20px;
    font-size: 15px;
    margin-top: 2px;
    border-radius: 12px;
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
  /* Divider lines (::before/::after pseudo-elements can't be done in markup utilities) */
  .auth-divider::before,
  .auth-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--border);
  }
</style>
