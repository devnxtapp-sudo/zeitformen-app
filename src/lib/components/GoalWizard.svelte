<script>
  import Modal from "./Modal.svelte";
  import { goalFromSport, DAY_KEYS, emptyExtraSession } from "../seed.js";
  import { COMPETITIONS, SPORTS } from "../sports.js";
  import { addPreparedGoal } from "../store.svelte.js";

  let { onclose, oncreated, dismissable = true } = $props();

  const DAY_FULL = {
    mo: "Montag",
    di: "Dienstag",
    mi: "Mittwoch",
    do: "Donnerstag",
    fr: "Freitag",
    sa: "Samstag",
    so: "Sonntag",
  };

  // 0 = Wettkampf, 1 = Trainingstage, 2 = Trainingstypen
  let index = $state(0);
  let count = $state(0); // Trainingstage pro Woche (0–7)
  // dayKey -> Array von typeIds (eine ID je Session; 1 oder 2 Sessions am Tag)
  let daySessions = $state({});
  let sessionTick = $state(0); // bumpt bei Session-Add/Remove (Höhen-Remeasure)

  // Gewählter Wettkampf -> Basis-Ziel (mit Trainingstypen). Wird beim Auswählen
  // einmalig erzeugt, damit die Typ-IDs für die Selects stabil bleiben.
  let competitionId = $state(null);
  let showCustom = $state(false);
  let customName = $state("");
  let base = $state(null);
  let types = $state([]); // [{ id, label, color }]

  // Die ersten `count` Wochentage sind Trainingstage (später verschiebbar).
  let selectedKeys = $derived(DAY_KEYS.slice(0, count));

  function chooseCompetition(comp) {
    if (comp.custom) {
      showCustom = true;
      return;
    }
    commit(comp.id, SPORTS[comp.sportId], comp.label);
  }

  function confirmCustom() {
    const name = customName.trim();
    if (!name) return;
    commit("custom", SPORTS.custom, name);
  }

  function commit(id, sport, label) {
    competitionId = id;
    base = goalFromSport(sport, label);
    types = base.types;
    daySessions = {};
  }

  function go(i) {
    if (i >= 1 && !base) return; // erst Wettkampf wählen
    if (i === 2) {
      if (count === 0) return; // mind. ein Tag vor Seite 3
      // jeden gewählten Tag mit einem rotierenden Standard-Typ vorbelegen
      for (let j = 0; j < selectedKeys.length; j++) {
        const k = selectedKeys[j];
        if (!daySessions[k] || !daySessions[k].length) {
          daySessions[k] = [types[j % types.length]?.id ?? types[0]?.id];
        }
      }
    }
    index = Math.min(Math.max(0, i), 2);
  }

  // Zweite Session am Tag hinzufügen / wieder entfernen.
  function addSession(key) {
    const cur = daySessions[key] || [];
    if (cur.length >= 2) return;
    daySessions[key] = [...cur, types[0]?.id ?? null];
    sessionTick++;
  }
  function removeSession(key) {
    const cur = daySessions[key] || [];
    daySessions[key] = cur.slice(0, 1);
    sessionTick++;
  }

  // --- swipe navigation between the onboarding pages ---
  let dragging = $state(false);
  let dragDX = $state(0);
  let vpW = 1;
  let startX = 0;
  let viewport;

  function onPointerDown(e) {
    // slider/selects/inputs/buttons need their own horizontal interaction
    if (e.target.closest("select, input, textarea, button")) return;
    dragging = true;
    startX = e.clientX;
    dragDX = 0;
    vpW = viewport?.offsetWidth || 1;
  }
  function onPointerMove(e) {
    if (!dragging) return;
    dragDX = e.clientX - startX;
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    const threshold = vpW * 0.18;
    if (dragDX <= -threshold) go(index + 1);
    else if (dragDX >= threshold) go(index - 1);
    dragDX = 0;
  }

  let offsetPct = $derived(-index * 100 + (dragging ? (dragDX / vpW) * 100 : 0));

  // Box-Höhe folgt der aktuellen Seite, statt immer so hoch wie die längste Seite
  // (Trainingstypen) zu sein. Bei Seitenwechsel / Inhaltsänderung neu messen.
  let pageEls = $state([]);
  let vpHeight = $state(null);
  $effect(() => {
    void index;
    void count;
    void showCustom;
    void customName;
    void types;
    void sessionTick;
    const el = pageEls[index];
    if (el) vpHeight = el.offsetHeight;
  });

  function finish() {
    const g = base;
    for (const key of DAY_KEYS) {
      if (selectedKeys.includes(key)) {
        const ids = daySessions[key] || [];
        const first = types.find((x) => x.id === ids[0]) || types[0];
        const extras = ids.slice(1).map((tid) => {
          const t = types.find((x) => x.id === tid) || types[0];
          const ex = emptyExtraSession();
          ex.typeId = t?.id ?? null;
          ex.title = t?.label ?? "";
          return ex;
        });
        g.days[key] = {
          typeId: first?.id ?? null,
          title: first?.label ?? "",
          meta: "",
          isRest: false,
          session: { objective: "", blocks: [], bonus: "" },
          extraSessions: extras,
        };
      } else {
        g.days[key] = {
          typeId: null,
          title: "Ruhetag",
          meta: "Ruhetag",
          isRest: true,
          session: { objective: "", blocks: [], bonus: "" },
          extraSessions: [],
        };
      }
    }
    const created = addPreparedGoal(g);
    oncreated?.(created);
  }
</script>

<Modal title="" {onclose} {dismissable}>
  <div
    class="viewport"
    bind:this={viewport}
    style={vpHeight != null ? `height: ${vpHeight}px` : ""}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <div class="track" class:dragging style="transform: translateX({offsetPct}%)">
      <div class="page" bind:this={pageEls[0]}>
        <div class="step-head">
          <h4>Wähle deinen Wettkampf</h4>
        </div>
        <div class="comp-grid">
          {#each COMPETITIONS as comp (comp.id)}
            <button
              type="button"
              class="comp"
              class:active={competitionId === comp.id || (comp.custom && showCustom)}
              onclick={() => chooseCompetition(comp)}
            >
              {comp.label}
            </button>
          {/each}
        </div>
        {#if showCustom}
          <div class="custom">
            <input
              bind:value={customName}
              placeholder="Name deines Wettkampfs"
              onkeydown={(e) => e.key === "Enter" && confirmCustom()}
            />
            <button class="btn btn-primary" disabled={!customName.trim()} onclick={confirmCustom}>
              Weiter
            </button>
          </div>
        {/if}
      </div>

      <div class="page" bind:this={pageEls[1]}>
        <div class="step-head">
          <h4>Wie oft trainierst du?</h4>
          <p class="hint muted">Die Tage lassen sich später jederzeit verschieben.</p>
        </div>
        <div class="slider-wrap">
          <div class="slider-value">{count}</div>
          <input
            class="day-slider"
            type="range"
            min="0"
            max="7"
            step="1"
            bind:value={count}
            aria-label="Trainingstage pro Woche"
          />
          <div class="slider-scale">
            <span>0</span>
            <span>7</span>
          </div>
        </div>
        <p class="count muted">{count} {count === 1 ? "Tag" : "Tage"} pro Woche</p>
      </div>

      <div class="page" bind:this={pageEls[2]}>
        <div class="step-head">
          <h4>Wähle deine Trainingstypen</h4>
        </div>
        <div class="type-list">
          {#each selectedKeys as key (key)}
            <div class="day-block">
              <div class="day-head">
                <span class="day-name">{DAY_FULL[key]}</span>
                {#if (daySessions[key]?.length || 1) < 2}
                  <button type="button" class="sess-add" onclick={() => addSession(key)}>
                    + 2. Session
                  </button>
                {:else}
                  <button type="button" class="sess-remove" onclick={() => removeSession(key)}>
                    2. Session entfernen
                  </button>
                {/if}
              </div>
              {#each daySessions[key] || [] as _, si (si)}
                <div class="sess-row">
                  {#if (daySessions[key]?.length || 1) > 1}
                    <span class="sess-label">{si + 1}. Session</span>
                  {/if}
                  <select class="type-select" bind:value={daySessions[key][si]}>
                    {#each types as t (t.id)}
                      <option value={t.id}>{t.label}</option>
                    {/each}
                  </select>
                </div>
              {/each}
            </div>
          {/each}
        </div>
        <div class="actions">
          <button class="btn btn-primary" onclick={finish}>Plan erstellen</button>
        </div>
      </div>
    </div>
  </div>

  <div class="dots">
    <button class="dot" class:active={index === 0} onclick={() => go(0)} aria-label="Seite 1"></button>
    <button class="dot" class:active={index === 1} onclick={() => go(1)} aria-label="Seite 2"></button>
    <button class="dot" class:active={index === 2} onclick={() => go(2)} aria-label="Seite 3"></button>
  </div>
</Modal>

<style>
  .viewport {
    overflow: hidden;
    touch-action: pan-y;
    transition: height 0.28s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  .track {
    display: flex;
    align-items: flex-start;
    will-change: transform;
  }
  .track:not(.dragging) {
    transition: transform 0.28s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  .page {
    flex: 0 0 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 2px;
  }
  .dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 18px;
  }
  .dot {
    width: 8px;
    height: 8px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--border-strong, var(--border));
    cursor: pointer;
    transition: background-color 0.15s, transform 0.15s;
  }
  .dot.active {
    background: var(--accent);
    transform: scale(1.25);
  }
  .comp-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .comp {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 56px;
    padding: 16px 14px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 14.5px;
    font-weight: 600;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s, transform 0.08s;
  }
  .comp:hover {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.08);
  }
  .comp:active {
    transform: scale(0.98);
  }
  .comp.active {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.12);
  }
  .custom {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }
  .custom input {
    flex: 1 1 auto;
    min-width: 0;
    padding: 12px 13px;
    font-size: 15px;
  }
  .step-head {
    margin-bottom: 16px;
  }
  .step-head h4 {
    font-size: 16px;
    margin: 0 0 4px;
  }
  .step-head p {
    font-size: 13.5px;
    margin: 0;
  }
  .step-head .hint {
    margin-top: 6px;
    font-size: 12.5px;
  }
  .slider-wrap {
    padding: 8px 4px 0;
  }
  .slider-value {
    text-align: center;
    font-size: 40px;
    font-weight: 800;
    line-height: 1;
    color: var(--accent);
    margin-bottom: 16px;
  }
  .day-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: var(--card);
    border: 1px solid var(--border);
    outline: none;
    cursor: pointer;
  }
  .day-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--accent);
    border: 3px solid var(--bg-elev);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
  .day-slider::-moz-range-thumb {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--accent);
    border: 3px solid var(--bg-elev);
    cursor: pointer;
  }
  .slider-scale {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 600;
  }
  .count {
    text-align: center;
    font-size: 13px;
    margin: 14px 0 0;
  }
  .type-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .day-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .day-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .day-name {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--text);
  }
  .sess-add,
  .sess-remove {
    background: none;
    border: none;
    padding: 2px 4px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .sess-add {
    color: var(--accent);
  }
  .sess-remove {
    color: var(--text-muted);
  }
  .sess-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .sess-label {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 600;
  }
  .type-select {
    flex: 1 1 auto;
    min-width: 0;
    max-width: 200px;
    padding: 10px 12px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 14px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
  }
</style>
