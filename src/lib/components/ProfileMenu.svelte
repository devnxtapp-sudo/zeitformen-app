<script>
  import { auth, logout } from "../auth.svelte.js";
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  import Calendar from "@lucide/svelte/icons/calendar";
  import CirclePlay from "@lucide/svelte/icons/circle-play";
  import SquarePen from "@lucide/svelte/icons/square-pen";
  import Star from "@lucide/svelte/icons/star";
  import ClipboardCheck from "@lucide/svelte/icons/clipboard-check";
  import ChartColumn from "@lucide/svelte/icons/chart-column";
  import Heart from "@lucide/svelte/icons/heart";
  import Gauge from "@lucide/svelte/icons/gauge";
  import Timer from "@lucide/svelte/icons/timer";
  import Coffee from "@lucide/svelte/icons/coffee";
  import Sun from "@lucide/svelte/icons/sun";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Settings from "@lucide/svelte/icons/settings";
  import LogOut from "@lucide/svelte/icons/log-out";
  import Moon from "@lucide/svelte/icons/moon";
  import Bell from "@lucide/svelte/icons/bell";
  import User from "@lucide/svelte/icons/user";
  import { theme, toggleTheme } from "../theme.svelte.js";
  import { activityNotifications, dismissAll } from "../notifications.svelte.js";
  import { sportIcon } from "../icons.js";

  let {
    goal = null,
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
    onaccount,
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
  let notifOpen = $state(false);

  let notes = $derived(activityNotifications(goal));
  let unread = $derived(notes.length);

  function toggleNotif() {
    notifOpen = !notifOpen;
    if (notifOpen) userMenuOpen = false;
  }

  function markAllRead() {
    dismissAll(notes);
  }

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
    <img class="logo-img" src="/logo.png" alt="rxZone" />
  </div>

  <nav class="sb-nav">
    <div class="sb-section">
      <div class="sb-label">Training</div>
      {#if onhome}
        <button class="nav-item" class:active={view === "dashboard"} onclick={() => go(onhome)}>
          <LayoutGrid class="ic" />
          <span class="nav-label">Dashboard</span>
        </button>
      {/if}
      {#if onplan}
        <button class="nav-item" class:active={view === "week"} onclick={() => go(onplan)}>
          <Calendar class="ic" />
          <span class="nav-label">Wochenplan</span>
        </button>
      {/if}
      {#if oncreate}
        <button class="nav-item" onclick={() => go(oncreate)}>
          <CirclePlay class="ic" />
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
            <SquarePen class="ic" />
            <span class="nav-label">{editMode ? "Bearbeiten beenden" : "Training bearbeiten"}</span>
          </button>
        {/if}
        {#if oncalendar}
          <button class="nav-item" class:active={view === "calendar"} onclick={() => go(oncalendar)}>
            <Calendar class="ic" />
            <span class="nav-label">Kalender</span>
          </button>
        {/if}
        {#if onracenutrition}
          <button class="nav-item" class:active={view === "racenutrition"} onclick={() => go(onracenutrition)}>
            <Star class="ic" />
            <span class="nav-label">Nutrition</span>
          </button>
        {/if}
        {#if onpacklist}
          <button class="nav-item" class:active={view === "packlist"} onclick={() => go(onpacklist)}>
            <ClipboardCheck class="ic" />
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
            <ChartColumn class="ic" />
            <span class="nav-label">Statistik</span>
          </button>
        {/if}
        {#if onbody}
          <button class="nav-item" class:active={view === "body"} onclick={() => go(onbody)}>
            <Heart class="ic" />
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
            <Gauge class="ic" />
            <span class="nav-label">Pace-Rechner</span>
          </button>
        {/if}
        {#if ontimer}
          <button class="nav-item" class:active={view === "timer"} onclick={() => go(ontimer)}>
            <Timer class="ic" />
            <span class="nav-label">Intervall-Timer</span>
          </button>
        {/if}
        {#if onnutrition}
          <button class="nav-item" class:active={view === "nutrition"} onclick={() => go(onnutrition)}>
            <Coffee class="ic" />
            <span class="nav-label">Ernährungsplan</span>
          </button>
        {/if}
      </div>
    {/if}

    {#if onsettings}
      <div class="sb-section">
        <div class="sb-label">System</div>
        <button class="nav-item" class:active={settingsActive} onclick={() => go(onsettings)}>
          <Sun class="ic" />
          <span class="nav-label">Ziel-Einstellungen</span>
        </button>
      </div>
    {/if}
  </nav>

  <div class="sb-spacer"></div>

  <div class="sb-user-wrap">
    {#if userMenuOpen}
      <div class="user-menu">
        {#if onaccount}
          <button class="um-item" onclick={() => userAction(onaccount)}>
            <User class="ic" />
            <span>Konto &amp; Profil</span>
          </button>
        {/if}
        <button class="um-item" onclick={() => userAction(onsync)} disabled={syncing}>
          <RefreshCw class="ic" />
          <span>Synchronisieren</span>
        </button>
        <button class="um-item" onclick={() => toggleTheme()}>
          {#if theme.mode === "light"}<Moon class="ic" /><span>Dunkler Modus</span>{:else}<Sun class="ic" /><span>Heller Modus</span>{/if}
        </button>
        {#if onappsettings}
          <button class="um-item" onclick={() => userAction(onappsettings)}>
            <Settings class="ic" />
          <span>Einstellungen</span>
          </button>
        {/if}
        <button class="um-item danger" onclick={() => userAction(logout)}>
          <LogOut class="ic" />
          <span>Abmelden</span>
        </button>
      </div>
    {/if}
    {#if notifOpen}
      <div class="notif-pop">
        <div class="notif-head">
          <span>Benachrichtigungen</span>
          <button class="notif-x" onclick={() => (notifOpen = false)} aria-label="Schließen">✕</button>
        </div>
        {#if notes.length}
          <div class="notif-list">
            {#each notes as n (n.id)}
              {@const NI = sportIcon(n.type)}
              <div class="notif-item">
                <span class="notif-ic"><NI size={14} /></span>
                <span class="notif-tx">
                  <span class="notif-title">{n.title}</span>
                  <span class="notif-sub">{n.sub}</span>
                </span>
              </div>
            {/each}
          </div>
          <button class="notif-readall" onclick={markAllRead}>Alle als gelesen markieren</button>
        {:else}
          <div class="notif-empty">Keine Benachrichtigungen.<br />Synchronisierte Aktivitäten erscheinen hier.</div>
        {/if}
      </div>
    {/if}
    <div class="sb-bottom">
      <button class="sb-user" class:open={userMenuOpen} onclick={() => { userMenuOpen = !userMenuOpen; if (userMenuOpen) notifOpen = false; }} aria-haspopup="true" aria-expanded={userMenuOpen}>
        <span class="user-avatar" class:syncing aria-hidden="true">
          {#if picture}<img src={picture} alt="" referrerpolicy="no-referrer" />{:else}{initial}{/if}
        </span>
        <span class="user-info">
          <span class="user-name">{name}</span>
          <span class="user-sync {synced && !syncing ? 'ok' : ''}"><span class="sync-dot"></span>{syncing ? "Synchronisiert …" : synced ? "Synchronisiert" : "Nicht synchron"}</span>
        </span>
        <svg class="chev ic" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15" /></svg>
      </button>
      <button class="sb-bell" class:has-unread={unread > 0} class:open={notifOpen} onclick={toggleNotif} aria-label="Benachrichtigungen" title="Benachrichtigungen">
        <Bell size={17} />
        {#if unread > 0}<span class="bell-dot">{unread > 9 ? "9+" : unread}</span>{/if}
      </button>
    </div>
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
  .sb-bottom { display: flex; align-items: stretch; }
  .sb-user {
    display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
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

  .sb-bell {
    position: relative; flex: none; display: flex; align-items: center; justify-content: center;
    width: 48px; border: none; border-left: 1px solid var(--border); background: none;
    color: var(--text-muted); cursor: pointer; transition: background 0.12s, color 0.12s;
  }
  .sb-bell:hover { background: var(--surface-2); color: var(--text); }
  .sb-bell.open { background: var(--surface-2); color: var(--text); }
  .sb-bell.has-unread { color: var(--accent); }
  .bell-dot {
    position: absolute; top: 8px; right: 8px; min-width: 15px; height: 15px; padding: 0 3px;
    display: flex; align-items: center; justify-content: center;
    background: var(--accent); color: #fff; font-size: 9px; font-weight: 700; line-height: 1;
    border-radius: 999px; border: 2px solid var(--card);
  }

  .notif-pop {
    position: absolute; left: 10px; right: 10px; bottom: calc(100% + 4px);
    background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45); z-index: 6; overflow: hidden;
  }
  .notif-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; border-bottom: 1px solid var(--border);
    font-size: 12px; font-weight: 700; color: var(--text);
  }
  .notif-x { border: none; background: none; color: var(--text-dim); font-size: 13px; cursor: pointer; padding: 2px 4px; }
  .notif-x:hover { color: var(--text); }
  .notif-list { max-height: 320px; overflow-y: auto; padding: 4px; }
  .notif-item { display: flex; align-items: center; gap: 10px; padding: 8px 8px; border-radius: 7px; }
  .notif-item:hover { background: var(--card-hover); }
  .notif-ic {
    width: 28px; height: 28px; flex: none; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(var(--accent-rgb), 0.15); color: var(--accent);
  }
  .notif-tx { display: flex; flex-direction: column; min-width: 0; }
  .notif-title { font-size: 12.5px; font-weight: 600; color: var(--text); }
  .notif-sub { font-size: 11px; color: var(--text-muted); }
  .notif-empty { padding: 18px 14px; font-size: 12px; color: var(--text-muted); text-align: center; line-height: 1.5; }
  .notif-readall {
    width: 100%; padding: 10px 12px; border: none; border-top: 1px solid var(--border);
    background: none; color: var(--accent); font-size: 12px; font-weight: 600;
    font-family: var(--font); cursor: pointer; transition: background 0.12s;
  }
  .notif-readall:hover { background: var(--card-hover); }

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
