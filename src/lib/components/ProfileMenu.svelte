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

  const itemClass =
    "flex w-full items-center gap-4 px-[22px] py-3.5 text-left text-[15px] font-semibold text-ink hover:bg-card";
  const iconClass = "w-[22px] flex-none text-center text-[17px] text-ink-muted";
</script>

<svelte:window
  onkeydown={onKey}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
/>

<div
  class="overlay fixed inset-0 z-[1000] bg-black/55"
  class:closing
  onclick={close}
  role="presentation"
></div>

<aside
  class="drawer fixed inset-y-0 left-0 z-[1001] flex w-[min(84vw,320px)] flex-col overflow-y-auto border-r border-line bg-surface-elev pt-7 pb-4 [touch-action:pan-y] [will-change:transform]"
  class:dragging
  style="transform: translateX({dragX}px)"
  onpointerdown={onPointerDown}
>
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

  <nav class="flex flex-col">
    <div class="flex flex-col border-t border-line py-2">
      {#if ontoggleedit}
        <button class={itemClass} onclick={() => { ontoggleedit(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">✎</span>
          <span>{editMode ? "Bearbeiten beenden" : "Trainingsplan bearbeiten"}</span>
        </button>
      {/if}
      {#if onsettings}
        <button class={itemClass} onclick={() => { onsettings(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">⚙</span>
          <span>Ziel-Einstellungen</span>
        </button>
      {/if}
      {#if oncreate}
        <button class={itemClass} onclick={() => { oncreate(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">＋</span>
          <span>Neues Training</span>
        </button>
      {/if}
    </div>

    <div class="flex flex-col border-t border-line py-2">
      {#if onhome}
        <button class={itemClass} onclick={() => { onhome(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">◆</span>
          <span>Dashboard</span>
        </button>
      {/if}
      {#if onplan}
        <button class={itemClass} onclick={() => { onplan(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">▤</span>
          <span>Wochenplan</span>
        </button>
      {/if}
      {#if oncalendar}
        <button class={itemClass} onclick={() => { oncalendar(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">▦</span>
          <span>Kalender</span>
        </button>
      {/if}
      {#if onstats}
        <button class={itemClass} onclick={() => { onstats(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">▲</span>
          <span>Statistik</span>
        </button>
      {/if}
      {#if onbody}
        <button class={itemClass} onclick={() => { onbody(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">◉</span>
          <span>Körperanalyse</span>
        </button>
      {/if}
      {#if onpace}
        <button class={itemClass} onclick={() => { onpace(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">◷</span>
          <span>Pace-Rechner</span>
        </button>
      {/if}
      {#if ontimer}
        <button class={itemClass} onclick={() => { ontimer(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">◴</span>
          <span>Intervall-Timer</span>
        </button>
      {/if}
      {#if onnutrition}
        <button class={itemClass} onclick={() => { onnutrition(); onclose?.(); }}>
          <span class={iconClass} aria-hidden="true">▢</span>
          <span>Ernährungsplan</span>
        </button>
      {/if}
    </div>

    {#if onracenutrition || onpacklist}
      <div class="flex flex-col border-t border-line py-2">
        <span class="px-[22px] pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-dim">Wettkampftag</span>
        {#if onracenutrition}
          <button class={itemClass} onclick={() => { onracenutrition(); onclose?.(); }}>
            <span class={iconClass} aria-hidden="true">◇</span>
            <span>Nutrition-Strategie</span>
          </button>
        {/if}
        {#if onpacklist}
          <button class={itemClass} onclick={() => { onpacklist(); onclose?.(); }}>
            <span class={iconClass} aria-hidden="true">▣</span>
            <span>Packliste</span>
          </button>
        {/if}
      </div>
    {/if}

    <div class="flex flex-col border-t border-line py-2">
      {#if onappsettings}
        <button class={itemClass} onclick={() => onappsettings()}>
          <span class={iconClass} aria-hidden="true">⚙</span>
          <span>Einstellungen</span>
          <span class="ml-auto text-[20px] text-ink-dim" aria-hidden="true">›</span>
        </button>
      {/if}
      <button class="{itemClass} hover:text-[#ff6b6f]" onclick={() => logout()}>
        <span class={iconClass} aria-hidden="true">⎋</span>
        <span>Abmelden</span>
      </button>
    </div>
  </nav>
</aside>

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
