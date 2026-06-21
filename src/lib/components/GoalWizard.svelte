<script>
  import Modal from "./Modal.svelte";
  import { Button, Input, Select } from "flowbite-svelte";
  import { goalFromSport, DAY_KEYS, emptyExtraSession, uid } from "../seed.js";
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
  let customName = $state("");
  let base = $state(null);
  let types = $state([]); // [{ id, label, color }]

  // eigene Trainingstypen hinzufügen (freier Text, z. B. "Unterkörper")
  let addingType = $state(false);
  let newTypeName = $state("");
  const NEW_TYPE_COLORS = [
    "#ef562f", "#f0a830", "#5fb87a", "#22d3ee",
    "#a779e9", "#ec4899", "#14b8a6", "#9ca3af",
  ];
  function addType() {
    const name = newTypeName.trim();
    if (!name) return;
    const color = NEW_TYPE_COLORS[types.length % NEW_TYPE_COLORS.length];
    types = [...types, { id: uid(), label: name, color }];
    newTypeName = "";
    addingType = false;
  }

  // Die ersten `count` Wochentage sind Trainingstage (später verschiebbar).
  let selectedKeys = $derived(DAY_KEYS.slice(0, count));

  function chooseCompetition(comp) {
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
    void customName;
    void types;
    void sessionTick;
    void addingType;
    void newTypeName;
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
        <div class="mb-4 text-center">
          <h4 class="text-lg font-semibold text-ink">Wähle deinen Wettkampf</h4>
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          {#each COMPETITIONS.filter((c) => !c.custom) as comp (comp.id)}
            <button
              type="button"
              class="flex min-h-[56px] items-center justify-center rounded-xl border px-3.5 py-4 text-center text-sm font-semibold text-ink transition-[border-color,background,transform] duration-100 hover:border-primary-500 hover:bg-primary-500/10 active:scale-[0.98]
                {competitionId === comp.id
                  ? 'border-primary-500 bg-primary-500/15'
                  : 'border-line bg-card'}"
              onclick={() => chooseCompetition(comp)}
            >
              {comp.label}
            </button>
          {/each}
        </div>
        <div class="mt-2.5 flex flex-col gap-2.5">
          <Input
            class="w-full"
            bind:value={customName}
            placeholder="z.B. Trailrun, Ultramarathon …"
            onkeydown={(e) => e.key === "Enter" && confirmCustom()}
          />
          {#if customName.trim()}
            <Button
              color="primary"
              class="w-full font-semibold text-[var(--on-accent)]"
              onclick={confirmCustom}
            >
              Weiter
            </Button>
          {/if}
        </div>
      </div>

      <div class="page" bind:this={pageEls[1]}>
        <div class="mb-4">
          <h4 class="text-lg font-semibold text-ink">Wie oft trainierst du?</h4>
          <p class="mt-1.5 text-xs text-ink-muted">Die Tage lassen sich später jederzeit verschieben.</p>
        </div>
        <div class="px-1 pt-2">
          <div class="mb-4 text-center text-[40px] font-extrabold leading-none text-primary-500">{count}</div>
          <input
            class="day-slider"
            type="range"
            min="0"
            max="7"
            step="1"
            bind:value={count}
            aria-label="Trainingstage pro Woche"
          />
          <div class="mt-2 flex justify-between text-xs font-semibold text-ink-muted">
            <span>0</span>
            <span>7</span>
          </div>
        </div>
        <p class="mt-3.5 text-center text-[13px] text-ink-muted">{count} {count === 1 ? "Tag" : "Tage"} pro Woche</p>
      </div>

      <div class="page" bind:this={pageEls[2]}>
        <div class="mb-4 flex items-start justify-between gap-3">
          <h4 class="text-lg font-semibold text-ink">Wähle deine Trainingstypen</h4>
          {#if !addingType}
            <button
              type="button"
              class="flex-none px-1 py-0.5 text-xs font-semibold text-primary-400"
              onclick={() => (addingType = true)}
            >
              + Eigener Typ
            </button>
          {/if}
        </div>
        {#if addingType}
          <div class="mb-3.5 flex gap-2.5">
            <Input
              class="flex-1"
              bind:value={newTypeName}
              placeholder="Eigener Typ, z. B. Unterkörper"
              onkeydown={(e) => e.key === "Enter" && addType()}
            />
            <Button
              color="primary"
              class="font-semibold text-[var(--on-accent)]"
              disabled={!newTypeName.trim()}
              onclick={addType}
            >
              Hinzufügen
            </Button>
          </div>
        {/if}
        <div class="flex flex-col gap-3.5">
          {#each selectedKeys as key (key)}
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-semibold text-ink">{DAY_FULL[key]}</span>
                {#if (daySessions[key]?.length || 1) < 2}
                  <button
                    type="button"
                    class="px-1 py-0.5 text-xs font-semibold text-primary-400"
                    onclick={() => addSession(key)}
                  >
                    + 2. Session
                  </button>
                {:else}
                  <button
                    type="button"
                    class="px-1 py-0.5 text-xs font-semibold text-ink-muted"
                    onclick={() => removeSession(key)}
                  >
                    2. Session entfernen
                  </button>
                {/if}
              </div>
              {#each daySessions[key] || [] as _, si (si)}
                <div class="flex items-center justify-between gap-3">
                  {#if (daySessions[key]?.length || 1) > 1}
                    <span class="text-[13px] font-semibold text-ink-muted">{si + 1}. Session</span>
                  {/if}
                  <Select class="max-w-[200px] flex-1" placeholder="" bind:value={daySessions[key][si]}>
                    {#each types as t (t.id)}
                      <option value={t.id}>{t.label}</option>
                    {/each}
                  </Select>
                </div>
              {/each}
            </div>
          {/each}
        </div>
        <div class="mt-6 flex justify-end gap-2.5">
          <Button color="primary" class="font-semibold text-[var(--on-accent)]" onclick={finish}>Plan erstellen</Button>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-[18px] flex justify-center gap-2">
    <button
      class="dot {index === 0 ? 'dot-active' : ''}"
      onclick={() => go(0)}
      aria-label="Seite 1"
    ></button>
    <button
      class="dot {index === 1 ? 'dot-active' : ''}"
      onclick={() => go(1)}
      aria-label="Seite 2"
    ></button>
    <button
      class="dot {index === 2 ? 'dot-active' : ''}"
      onclick={() => go(2)}
      aria-label="Seite 3"
    ></button>
  </div>
</Modal>

<style>
  /* Swipe slider mechanics — transforms/height animation utilities can't express cleanly */
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
  /* Pagination dots — need active scale transform */
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
  .dot-active {
    background: var(--accent);
    transform: scale(1.25);
  }
  /* Range slider with custom neon thumb — pseudo-elements not expressible as utilities */
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
</style>
