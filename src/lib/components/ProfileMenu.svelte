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
    onnutrition,
    onracenutrition,
    onpacklist,
    onappsettings,
    editMode = false,
  } = $props();

  let email = $derived(auth.user?.email ?? "");
  let picture = $derived(auth.user?.picture ?? null);
  let name = $derived(auth.user?.name || email.split("@")[0] || "Athlet");
  let initial = $derived((name[0] || email[0] || "?").toUpperCase());

  // swipe-to-close: drag the drawer left with the finger/mouse
  const OFFSCREEN = -380;
  let dragX = $state(0);
  let dragging = $state(false);
  let closing = $state(false);
  let startX = 0;

  function close() {
    if (closing) return;
    closing = true;
    dragX = OFFSCREEN; // animate the drawer off-screen via CSS transition
    setTimeout(() => onclose?.(), 220);
  }

  function onPointerDown(e) {
    if (closing) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    dragX = Math.min(0, dx); // only allow leftward travel
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (dragX < -70) close();
    else dragX = 0; // snap back
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }
</script>

<svelte:window
  onkeydown={onKey}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
/>

<div
  class="overlay"
  class:closing
  onclick={close}
  role="presentation"
></div>

<aside
  class="drawer"
  class:dragging
  style="transform: translateX({dragX}px)"
  onpointerdown={onPointerDown}
>
  <header class="who">
    <button
      class="avatar-lg"
      class:syncing
      onclick={() => onsync?.()}
      disabled={syncing}
      aria-label="Daten synchronisieren"
      title="Tippen zum Synchronisieren"
    >
      {#if picture}
        <img src={picture} alt={name} referrerpolicy="no-referrer" />
      {:else}
        {initial}
      {/if}
    </button>
    <div class="meta">
      <span class="name">{name}</span>
      <span class="mail">{email}</span>
      <span class="sync-hint" class:done={synced && !syncing}>
        {#if syncing}
          Synchronisiert …
        {:else if synced}
          <span class="sync-dot" aria-hidden="true"></span>Synchronisiert
        {:else}
          Tippen zum Synchronisieren
        {/if}
      </span>
    </div>
  </header>

  <nav class="menu">
    <div class="group">
      {#if ontoggleedit}
        <button class="item" onclick={() => { ontoggleedit(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">✎</span>
          <span>{editMode ? "Bearbeiten beenden" : "Trainingsplan bearbeiten"}</span>
        </button>
      {/if}
      {#if onsettings}
        <button class="item" onclick={() => { onsettings(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">⚙</span>
          <span>Ziel-Einstellungen</span>
        </button>
      {/if}
      {#if oncreate}
        <button class="item" onclick={() => { oncreate(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">＋</span>
          <span>Neues Training</span>
        </button>
      {/if}
    </div>

    <div class="group">
      {#if onhome}
        <button class="item" onclick={() => { onhome(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">◆</span>
          <span>Dashboard</span>
        </button>
      {/if}
      {#if onplan}
        <button class="item" onclick={() => { onplan(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">▤</span>
          <span>Wochenplan</span>
        </button>
      {/if}
      {#if oncalendar}
        <button class="item" onclick={() => { oncalendar(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">▦</span>
          <span>Kalender</span>
        </button>
      {/if}
      {#if onstats}
        <button class="item" onclick={() => { onstats(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">▲</span>
          <span>Statistik</span>
        </button>
      {/if}
      {#if onbody}
        <button class="item" onclick={() => { onbody(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">◉</span>
          <span>Körperanalyse</span>
        </button>
      {/if}
      {#if onpace}
        <button class="item" onclick={() => { onpace(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">◷</span>
          <span>Pace-Rechner</span>
        </button>
      {/if}
      {#if onnutrition}
        <button class="item" onclick={() => { onnutrition(); onclose?.(); }}>
          <span class="ic" aria-hidden="true">▢</span>
          <span>Ernährungsplan</span>
        </button>
      {/if}
    </div>

    {#if onracenutrition || onpacklist}
      <div class="group">
        <span class="group-label">Wettkampftag</span>
        {#if onracenutrition}
          <button class="item" onclick={() => { onracenutrition(); onclose?.(); }}>
            <span class="ic" aria-hidden="true">◇</span>
            <span>Nutrition-Strategie</span>
          </button>
        {/if}
        {#if onpacklist}
          <button class="item" onclick={() => { onpacklist(); onclose?.(); }}>
            <span class="ic" aria-hidden="true">▣</span>
            <span>Packliste</span>
          </button>
        {/if}
      </div>
    {/if}

    <div class="group">
      {#if onappsettings}
        <button class="item" onclick={() => onappsettings()}>
          <span class="ic" aria-hidden="true">⚙</span>
          <span>Einstellungen</span>
          <span class="chev" aria-hidden="true">›</span>
        </button>
      {/if}
      <button class="item danger" onclick={() => logout()}>
        <span class="ic" aria-hidden="true">⎋</span>
        <span>Abmelden</span>
      </button>
    </div>
  </nav>
</aside>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 1000;
    animation: fade-in 0.18s ease;
  }
  .overlay.closing {
    animation: fade-out 0.22s ease forwards;
  }
  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(84vw, 320px);
    background: var(--bg-elev);
    border-right: 1px solid var(--border);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    padding: 28px 0 16px;
    overflow-y: auto;
    will-change: transform;
    touch-action: pan-y;
    animation: slide-in 0.22s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  /* smooth snap-back / close while not actively dragging */
  .drawer:not(.dragging) {
    transition: transform 0.22s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  @keyframes slide-in {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  .who {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 6px 20px 22px;
  }
  .avatar-lg {
    flex: 0 0 auto;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    padding: 0;
    overflow: hidden;
    background: linear-gradient(135deg, var(--accent), #3b6fd4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
  }
  .avatar-lg img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .avatar-lg:hover {
    box-shadow: 0 0 0 3px rgba(91, 141, 239, 0.25);
  }
  .avatar-lg.syncing {
    animation: avatar-spin 0.9s linear infinite;
    box-shadow: 0 0 0 2px rgba(91, 141, 239, 0.5);
  }
  @keyframes avatar-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .name {
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .mail {
    font-size: 13px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sync-hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--accent);
    margin-top: 1px;
  }
  .sync-hint.done {
    color: var(--c-zone2, #5fb87a);
  }
  .sync-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c-zone2, #5fb87a);
    flex: 0 0 auto;
  }
  .menu {
    display: flex;
    flex-direction: column;
  }
  .group {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border);
    padding: 8px 0;
  }
  .group-label {
    padding: 4px 22px 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 14px 22px;
    background: none;
    border: none;
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .item:hover {
    background: var(--card);
  }
  .ic {
    flex: 0 0 auto;
    width: 22px;
    font-size: 17px;
    text-align: center;
    color: var(--text-muted);
  }
  .item.danger:hover {
    color: var(--c-danger, #e5534b);
  }
  .chev {
    margin-left: auto;
    color: var(--text-dim);
    font-size: 20px;
  }
</style>
