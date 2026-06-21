<script>
  import { auth, logout } from "../auth.svelte.js";

  let {
    onclose,
    onsync,
    syncing = false,
    synced = false,
    onsettings,
    oncreate,
    ontoggleedit,
    onhome,
    onplan,
    oncalendar,
    onstats,
    onbody,
    onpace,
    ontimer,
    onnutrition,
    onracenutrition,
    onpacklist,
    onappsettings,
    editMode = false,
    // "drawer" = mobile off-canvas overlay; "sidebar" = desktop fixed rail.
    variant = "drawer",
    view = "dashboard",
    settingsActive = false,
  } = $props();

  let isSidebar = $derived(variant === "sidebar");

  let email = $derived(auth.user?.email ?? "");
  let picture = $derived(auth.user?.picture ?? null);
  let name = $derived(auth.user?.name || email.split("@")[0] || "Athlet");
  let initial = $derived((name[0] || email[0] || "?").toUpperCase());

  let userMenuOpen = $state(false);

  // swipe-to-close (drawer variant only)
  let dragX = $state(0);
  let dragging = $state(false);
  let closing = $state(false);
  let startX = 0;

  function close() {
    if (closing) return;
    closing = true;
    dragX = -380;
    setTimeout(() => onclose?.(), 220);
  }
  function onPointerDown(e) {
    if (isSidebar || closing) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest("button")) return;
    dragging = true;
    startX = e.clientX;
  }
  function onPointerMove(e) {
    if (!dragging) return;
    dragX = Math.min(0, e.clientX - startX);
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (dragX < -70) close();
    else dragX = 0;
  }
  function onKey(e) {
    if (e.key === "Escape") {
      if (userMenuOpen) userMenuOpen = false;
      else if (!isSidebar) close();
    }
  }
  function dismiss() {
    if (!isSidebar) onclose?.();
  }
  function go(fn) {
    fn?.();
    dismiss();
  }
  function userAction(fn) {
    userMenuOpen = false;
    fn?.();
    dismiss();
  }
</script>

<svelte:window onkeydown={onKey} onpointermove={onPointerMove} onpointerup={onPointerUp} />

{#snippet sidebarContent()}
  <div class="sb-logo">
    <img class="logo-img" src="/logo.png" alt="" />
    <span class="logo-text">rxZone</span>
  </div>

  <nav class="sb-nav">
    <div class="sb-section">
      <div class="sb-label">Training</div>
      {#if onhome}
        <button class="nav-item" class:active={view === "dashboard"} onclick={() => go(onhome)}>
          <svg class="ic" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
          <span class="nav-label">Dashboard</span>
        </button>
      {/if}
      {#if onplan}
        <button class="nav-item" class:active={view === "week"} onclick={() => go(onplan)}>
          <svg class="ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <span class="nav-label">Wochenplan</span>
        </button>
      {/if}
      {#if oncreate}
        <button class="nav-item" onclick={() => go(oncreate)}>
          <svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
          <span class="nav-label">Neues Training</span>
          <span class="nav-badge">+</span>
        </button>
      {/if}
    </div>

    {#if ontoggleedit || oncalendar || onracenutrition || onpacklist}
      <div class="sb-section">
        <div class="sb-label">Planung</div>
        {#if ontoggleedit}
          <button class="nav-item" class:active={editMode} onclick={() => go(ontoggleedit)}>
            <svg class="ic" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            <span class="nav-label">{editMode ? "Bearbeiten beenden" : "Training bearbeiten"}</span>
          </button>
        {/if}
        {#if oncalendar}
          <button class="nav-item" class:active={view === "calendar"} onclick={() => go(oncalendar)}>
            <svg class="ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <span class="nav-label">Kalender</span>
          </button>
        {/if}
        {#if onracenutrition}
          <button class="nav-item" class:active={view === "racenutrition"} onclick={() => go(onracenutrition)}>
            <svg class="ic" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span class="nav-label">Nutrition</span>
          </button>
        {/if}
        {#if onpacklist}
          <button class="nav-item" class:active={view === "packlist"} onclick={() => go(onpacklist)}>
            <svg class="ic" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            <span class="nav-label">Packliste</span>
          </button>
        {/if}
      </div>
    {/if}

    {#if onstats || onbody}
      <div class="sb-section">
        <div class="sb-label">Analyse</div>
        {#if onstats}
          <button class="nav-item" class:active={view === "stats"} onclick={() => go(onstats)}>
            <svg class="ic" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
            <span class="nav-label">Statistik</span>
          </button>
        {/if}
        {#if onbody}
          <button class="nav-item" class:active={view === "body"} onclick={() => go(onbody)}>
            <svg class="ic" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            <span class="nav-label">Körperanalyse</span>
          </button>
        {/if}
      </div>
    {/if}

    {#if onpace || ontimer || onnutrition}
      <div class="sb-section">
        <div class="sb-label">Tools</div>
        {#if onpace}
          <button class="nav-item" class:active={view === "pace"} onclick={() => go(onpace)}>
            <svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <span class="nav-label">Pace-Rechner</span>
          </button>
        {/if}
        {#if ontimer}
          <button class="nav-item" class:active={view === "timer"} onclick={() => go(ontimer)}>
            <svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <span class="nav-label">Intervall-Timer</span>
          </button>
        {/if}
        {#if onnutrition}
          <button class="nav-item" class:active={view === "nutrition"} onclick={() => go(onnutrition)}>
            <svg class="ic" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>
            <span class="nav-label">Ernährungsplan</span>
          </button>
        {/if}
      </div>
    {/if}

    {#if onsettings}
      <div class="sb-section">
        <div class="sb-label">System</div>
        <button class="nav-item" class:active={settingsActive} onclick={() => go(onsettings)}>
          <svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
          <span class="nav-label">Ziel-Einstellungen</span>
        </button>
      </div>
    {/if}
  </nav>

  <div class="sb-spacer"></div>

  <div class="sb-user-wrap">
    {#if userMenuOpen}
      <div class="user-menu">
        <button class="um-item" onclick={() => userAction(onsync)} disabled={syncing}>
          <svg class="ic" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          <span>Synchronisieren</span>
        </button>
        {#if onappsettings}
          <button class="um-item" onclick={() => userAction(onappsettings)}>
            <svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          <span>Einstellungen</span>
          </button>
        {/if}
        <button class="um-item danger" onclick={() => userAction(logout)}>
          <svg class="ic" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          <span>Abmelden</span>
        </button>
      </div>
    {/if}
    <button class="sb-user" class:open={userMenuOpen} onclick={() => (userMenuOpen = !userMenuOpen)} aria-haspopup="true" aria-expanded={userMenuOpen}>
      <span class="user-avatar" class:syncing aria-hidden="true">
        {#if picture}<img src={picture} alt="" referrerpolicy="no-referrer" />{:else}{initial}{/if}
      </span>
      <span class="user-info">
        <span class="user-name">{name}</span>
        <span class="user-sync {synced && !syncing ? 'ok' : ''}"><span class="sync-dot"></span>{syncing ? "Synchronisiert …" : synced ? "Synchronisiert" : "Nicht synchron"}</span>
      </span>
      <svg class="chev ic" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15" /></svg>
    </button>
  </div>
{/snippet}

{#if isSidebar}
  <aside class="rail">{@render sidebarContent()}</aside>
{:else}
  <div class="overlay" class:closing onclick={close} role="presentation"></div>
  <aside class="drawer" class:dragging style="transform: translateX({dragX}px)" onpointerdown={onPointerDown}>
    {@render sidebarContent()}
  </aside>
{/if}

<style>
  .rail { width: 220px; flex: none; background: var(--bg-elev); border-right: 1px solid var(--border); display: none; }
  @media (min-width: 1024px) {
    .rail { display: flex; flex-direction: column; position: sticky; top: 0; height: 100dvh; overflow-y: auto; }
  }
  .overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0, 0, 0, 0.55); animation: fade-in 0.18s ease; }
  .overlay.closing { animation: fade-out 0.22s ease forwards; }
  .drawer {
    position: fixed; inset-block: 0; left: 0; z-index: 1001; width: min(82vw, 260px);
    background: var(--bg-elev); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; overflow-y: auto; touch-action: pan-y; will-change: transform;
    animation: slide-in 0.22s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  .drawer:not(.dragging) { transition: transform 0.22s cubic-bezier(0.22, 0.7, 0.3, 1); }
  @media (min-width: 1024px) { .drawer, .overlay { display: none; } }

  .sb-logo { display: flex; align-items: center; gap: 10px; padding: 18px 16px 16px; border-bottom: 1px solid var(--border); }
  .logo-img { width: 32px; height: 32px; flex: none; border-radius: 8px; object-fit: cover; }
  .logo-text { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.01em; }

  .sb-nav { display: flex; flex-direction: column; }
  .sb-section { padding: 12px 10px 4px; }
  .sb-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); padding: 0 6px; margin-bottom: 4px; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 8px 10px; border: none; background: none; border-radius: 7px;
    color: var(--text-muted); font-size: 13px; font-weight: 500; font-family: var(--font);
    cursor: pointer; text-align: left; transition: all 0.12s ease;
  }
  .nav-item:hover { background: var(--surface-2); color: var(--text); }
  .nav-item.active { background: rgba(var(--accent-rgb), 0.15); color: var(--accent); font-weight: 600; }
  .ic { width: 15px; height: 15px; flex: none; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; opacity: 0.85; }
  .nav-item.active .ic { opacity: 1; }
  .nav-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-badge { margin-left: auto; background: var(--accent); color: #fff; font-size: 10px; font-weight: 700; line-height: 1; padding: 3px 6px; border-radius: 999px; }

  .sb-spacer { flex: 1; }

  .sb-user-wrap { position: relative; border-top: 1px solid var(--border); }
  .sb-user {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 12px 14px; border: none; background: none; cursor: pointer; font-family: var(--font);
    transition: background 0.12s;
  }
  .sb-user:hover, .sb-user.open { background: var(--surface-2); }
  .user-avatar {
    width: 32px; height: 32px; flex: none; border-radius: 50%; overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--c-cyan));
    color: #fff; font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .user-avatar.syncing { animation: spin 0.9s linear infinite; }
  .user-info { min-width: 0; flex: 1; text-align: left; display: flex; flex-direction: column; }
  .user-name { font-size: 13px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .user-sync { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
  .user-sync.ok { color: var(--c-success); }
  .sync-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex: none; }
  .chev { width: 14px; height: 14px; opacity: 0.6; transition: transform 0.15s; }
  .sb-user.open .chev { transform: rotate(180deg); }

  .user-menu {
    position: absolute; left: 10px; right: 10px; bottom: calc(100% + 4px);
    background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 10px;
    padding: 6px; display: flex; flex-direction: column; gap: 2px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45); z-index: 5;
  }
  .um-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 9px 10px; border: none; background: none; border-radius: 7px;
    color: var(--text); font-size: 13px; font-weight: 500; font-family: var(--font);
    cursor: pointer; text-align: left; transition: background 0.12s;
  }
  .um-item:hover { background: var(--card-hover); }
  .um-item.danger { color: #ff6b6f; }
  .um-item:disabled { opacity: 0.5; cursor: default; }

  @keyframes slide-in { from { transform: translateX(-100%); } }
  @keyframes fade-in { from { opacity: 0; } }
  @keyframes fade-out { to { opacity: 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
