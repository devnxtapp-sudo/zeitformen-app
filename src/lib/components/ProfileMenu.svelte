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
    // "drawer" = mobile off-canvas overlay (default, keeps swipe/Escape/sync-tap).
    // "sidebar" = desktop fixed rail, always visible (no overlay/drag).
    variant = "drawer",
    // current app.view + modal flags, used to highlight the active nav item.
    view = "dashboard",
    settingsActive = false,
  } = $props();

  let isSidebar = $derived(variant === "sidebar");

  let email = $derived(auth.user?.email ?? "");
  let picture = $derived(auth.user?.picture ?? null);
  let name = $derived(auth.user?.name || email.split("@")[0] || "Athlet");
  let initial = $derived((name[0] || email[0] || "?").toUpperCase());

  // swipe-to-close: drag the drawer left with the finger/mouse (drawer variant only)
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
    if (isSidebar || closing) return;
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
    if (!isSidebar && e.key === "Escape") close();
  }

  // On the desktop sidebar nav stays mounted, so a tap shouldn't close anything;
  // on the mobile drawer every navigation also dismisses the overlay.
  function dismiss() {
    if (!isSidebar) onclose?.();
  }

  const itemBase =
    "flex w-full items-center gap-4 rounded-lg px-[18px] py-3 text-left text-[15px] font-semibold transition-colors";
  const itemIdle = "text-ink hover:bg-card-hover";
  const itemActive = "bg-primary-600/15 text-primary-500";
  function navClass(active) {
    return `${itemBase} ${active ? itemActive : itemIdle}`;
  }
  const iconClass = "w-[22px] flex-none text-center text-[17px]";
  const sectionClass =
    "px-[18px] pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-dim";
</script>

<svelte:window
  onkeydown={onKey}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
/>

{#snippet navItems()}
  <nav class="flex flex-col gap-1 px-2">
    <!-- TRAINING -->
    <div class="flex flex-col gap-1 py-2">
      <span class={sectionClass}>TRAINING</span>
      {#if onhome}
        <button class={navClass(view === "dashboard")} onclick={() => { onhome(); dismiss(); }}>
          <span class="{iconClass} {view === 'dashboard' ? '' : 'text-ink-muted'}" aria-hidden="true">◆</span>
          <span>Dashboard</span>
        </button>
      {/if}
      {#if onplan}
        <button class={navClass(view === "week")} onclick={() => { onplan(); dismiss(); }}>
          <span class="{iconClass} {view === 'week' ? '' : 'text-ink-muted'}" aria-hidden="true">▤</span>
          <span>Wochenplan</span>
        </button>
      {/if}
      {#if oncreate}
        <button class={navClass(false)} onclick={() => { oncreate(); dismiss(); }}>
          <span class="{iconClass} text-ink-muted" aria-hidden="true">＋</span>
          <span>Neues Training</span>
        </button>
      {/if}
    </div>

    <!-- PLANUNG -->
    {#if ontoggleedit || oncalendar || onracenutrition || onpacklist}
      <div class="flex flex-col gap-1 border-t border-line py-2">
        <span class={sectionClass}>PLANUNG</span>
        {#if ontoggleedit}
          <button class={navClass(editMode)} onclick={() => { ontoggleedit(); dismiss(); }}>
            <span class="{iconClass} {editMode ? '' : 'text-ink-muted'}" aria-hidden="true">✎</span>
            <span>{editMode ? "Bearbeiten beenden" : "Training bearbeiten"}</span>
          </button>
        {/if}
        {#if oncalendar}
          <button class={navClass(view === "calendar")} onclick={() => { oncalendar(); dismiss(); }}>
            <span class="{iconClass} {view === 'calendar' ? '' : 'text-ink-muted'}" aria-hidden="true">▦</span>
            <span>Kalender</span>
          </button>
        {/if}
        {#if onracenutrition}
          <button class={navClass(view === "racenutrition")} onclick={() => { onracenutrition(); dismiss(); }}>
            <span class="{iconClass} {view === 'racenutrition' ? '' : 'text-ink-muted'}" aria-hidden="true">◇</span>
            <span>Nutrition</span>
          </button>
        {/if}
        {#if onpacklist}
          <button class={navClass(view === "packlist")} onclick={() => { onpacklist(); dismiss(); }}>
            <span class="{iconClass} {view === 'packlist' ? '' : 'text-ink-muted'}" aria-hidden="true">▣</span>
            <span>Packliste</span>
          </button>
        {/if}
      </div>
    {/if}

    <!-- ANALYSE -->
    {#if onstats || onbody}
      <div class="flex flex-col gap-1 border-t border-line py-2">
        <span class={sectionClass}>ANALYSE</span>
        {#if onstats}
          <button class={navClass(view === "stats")} onclick={() => { onstats(); dismiss(); }}>
            <span class="{iconClass} {view === 'stats' ? '' : 'text-ink-muted'}" aria-hidden="true">▲</span>
            <span>Statistik</span>
          </button>
        {/if}
        {#if onbody}
          <button class={navClass(view === "body")} onclick={() => { onbody(); dismiss(); }}>
            <span class="{iconClass} {view === 'body' ? '' : 'text-ink-muted'}" aria-hidden="true">◉</span>
            <span>Körperanalyse</span>
          </button>
        {/if}
      </div>
    {/if}

    <!-- TOOLS -->
    {#if onpace || ontimer || onnutrition}
      <div class="flex flex-col gap-1 border-t border-line py-2">
        <span class={sectionClass}>TOOLS</span>
        {#if onpace}
          <button class={navClass(view === "pace")} onclick={() => { onpace(); dismiss(); }}>
            <span class="{iconClass} {view === 'pace' ? '' : 'text-ink-muted'}" aria-hidden="true">◷</span>
            <span>Pace-Rechner</span>
          </button>
        {/if}
        {#if ontimer}
          <button class={navClass(view === "timer")} onclick={() => { ontimer(); dismiss(); }}>
            <span class="{iconClass} {view === 'timer' ? '' : 'text-ink-muted'}" aria-hidden="true">◴</span>
            <span>Intervall-Timer</span>
          </button>
        {/if}
        {#if onnutrition}
          <button class={navClass(view === "nutrition")} onclick={() => { onnutrition(); dismiss(); }}>
            <span class="{iconClass} {view === 'nutrition' ? '' : 'text-ink-muted'}" aria-hidden="true">▢</span>
            <span>Ernährungsplan</span>
          </button>
        {/if}
      </div>
    {/if}

    <!-- SYSTEM -->
    <div class="flex flex-col gap-1 border-t border-line py-2">
      <span class={sectionClass}>SYSTEM</span>
      {#if onsettings}
        <button class={navClass(settingsActive)} onclick={() => { onsettings(); dismiss(); }}>
          <span class="{iconClass} {settingsActive ? '' : 'text-ink-muted'}" aria-hidden="true">◎</span>
          <span>Ziel-Einstellungen</span>
        </button>
      {/if}
      {#if onappsettings}
        <button class={navClass(view === "account" || view === "garmin")} onclick={() => onappsettings()}>
          <span class="{iconClass} {view === 'account' || view === 'garmin' ? '' : 'text-ink-muted'}" aria-hidden="true">⚙</span>
          <span>Einstellungen</span>
          <span class="ml-auto text-[20px] text-ink-dim" aria-hidden="true">›</span>
        </button>
      {/if}
      <button class="{itemBase} text-ink hover:bg-card-hover hover:text-[#ff6b6f]" onclick={() => logout()}>
        <span class="{iconClass} text-ink-muted" aria-hidden="true">⎋</span>
        <span>Abmelden</span>
      </button>
    </div>
  </nav>
{/snippet}

{#snippet brandHeader()}
  <header class="flex items-center gap-3.5 px-5 pt-1.5 pb-[22px]">
    <button
      class="avatar-lg flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-[22px] font-bold text-[var(--on-accent)] hover:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.25)]"
      class:syncing
      onclick={() => onsync?.()}
      disabled={syncing}
      aria-label="Daten synchronisieren"
      title="Tippen zum Synchronisieren"
    >
      {#if picture}
        <img class="block h-full w-full object-cover" src={picture} alt={name} referrerpolicy="no-referrer" />
      {:else}
        {initial}
      {/if}
    </button>
    <div class="flex min-w-0 flex-col gap-[3px]">
      <span class="text-[19px] font-bold tracking-[-0.01em] text-ink">{name}</span>
      <span class="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-ink-muted">{email}</span>
      <span
        class="mt-px inline-flex items-center gap-1.5 text-[11.5px] font-semibold {synced && !syncing ? 'text-zone2' : 'text-primary-500'}"
      >
        {#if syncing}
          Synchronisiert …
        {:else if synced}
          <span class="h-2 w-2 flex-none rounded-full bg-zone2" aria-hidden="true"></span>Synchronisiert
        {:else}
          Tippen zum Synchronisieren
        {/if}
      </span>
    </div>
  </header>
{/snippet}

{#if isSidebar}
  <!-- Desktop fixed rail: always visible inside the layout flex row. -->
  <aside
    class="hidden lg:flex lg:sticky lg:top-0 lg:h-screen w-64 flex-none flex-col overflow-y-auto border-r border-line bg-surface-elev pt-7 pb-4"
  >
    <a href="/" class="flex items-center gap-2.5 px-5 pb-5" aria-label="rxZone">
      <img src="/logo.png" alt="" class="h-9 w-9 flex-none rounded-lg object-cover" />
      <span class="text-[20px] font-extrabold tracking-[-0.01em] text-ink">rxZone</span>
    </a>
    {@render brandHeader()}
    {@render navItems()}
  </aside>
{:else}
  <!-- Mobile off-canvas drawer overlay. -->
  <div
    class="overlay fixed inset-0 z-[1000] bg-black/55 lg:hidden"
    class:closing
    onclick={close}
    role="presentation"
  ></div>

  <aside
    class="drawer fixed inset-y-0 left-0 z-[1001] flex w-[min(84vw,320px)] flex-col overflow-y-auto border-r border-line bg-surface-elev pt-7 pb-4 lg:hidden [touch-action:pan-y] [will-change:transform]"
    class:dragging
    style="transform: translateX({dragX}px)"
    onpointerdown={onPointerDown}
  >
    {@render brandHeader()}
    {@render navItems()}
  </aside>
{/if}

<style>
  /* Entrance/exit + spin animations and the drag snap-back transition can't be
     expressed as static utilities, so they stay here. */
  .overlay {
    animation: fade-in 0.18s ease;
  }
  .overlay.closing {
    animation: fade-out 0.22s ease forwards;
  }
  .drawer {
    animation: slide-in 0.22s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  /* smooth snap-back / close while not actively dragging */
  .drawer:not(.dragging) {
    transition: transform 0.22s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  .avatar-lg.syncing {
    animation: avatar-spin 0.9s linear infinite;
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.5);
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
  @keyframes avatar-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
