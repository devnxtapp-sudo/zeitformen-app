<script>
  import { modalityById, formatInterval, METRIC_META } from "../seed.js";

  // In-Workout-Übungskarten: eine Übung pro Seite, horizontal wischbar.
  // Hat der Tag eine Modalität + Intervalle, wird je Intervall eine Karte mit
  // modalitäts-passenden Feldern gezeigt. Sonst Fallback auf die Items der
  // "Inhalt"-Blöcke (Reps/kg), damit ältere Pläne weiter funktionieren.
  let { goal, day, onsave, ondone } = $props();

  let modality = $derived(modalityById(day?.session?.modality));
  let intervals = $derived(day?.session?.intervals ?? []);
  let useIntervals = $derived(!!(modality && intervals.length));

  // Welche Ist-Felder die Karte zeigt – aus der Modalität, sonst reps/weight.
  let logFields = $derived(useIntervals ? modality.log : ["reps", "weight"]);

  // setCount = wie viele Sätze/Wiederholungen das Intervall hat (z.B. "3 × 10
  // Wdh" -> 3 Eingabe-Sätze). Legacy-Items haben immer einen.
  let exercises = $derived(
    useIntervals
      ? intervals.map((iv, i) => ({
          id: i,
          label: formatInterval(iv),
          setCount: Math.max(1, Number(iv.repeat) || 1),
        }))
      : (day?.session?.blocks ?? [])
          .filter((b) => /inhalt/i.test(b.title ?? ""))
          .flatMap((b) => b.items ?? [])
          .map((label, i) => ({ id: i, label, setCount: 1 })),
  );

  // Letzte gespeicherte Notiz für eine Übung (über alle bisherigen Einheiten,
  // jüngster Eintrag zuerst) — so trägt sich die Notiz in die nächste Woche fort.
  function lastNoteFor(name) {
    const log = goal?.log ?? {};
    const dates = Object.keys(log).sort().reverse();
    for (const d of dates) {
      const ex = (log[d]?.exercises ?? []).find(
        (e) => e.name === name && (e.note ?? "").trim(),
      );
      if (ex) return ex.note;
    }
    return "";
  }

  // pro Übung eingegebene Werte (Index -> {sets:[{feld:wert}], note}); ein
  // Eingabe-Satz je geplanter Wiederholung.
  let values = $state({});
  $effect(() => {
    for (const ex of exercises) {
      if (!values[ex.id]) {
        const sets = [];
        for (let i = 0; i < ex.setCount; i++) {
          const f = {};
          for (const k of logFields) f[k] = "";
          sets.push(f);
        }
        values[ex.id] = { sets, note: lastNoteFor(ex.label) };
      }
    }
  });

  let index = $state(0);
  let dragging = $state(false);
  let dragDX = $state(0);
  let trackW = $state(1);
  let startX = 0;
  let track;

  $effect(() => {
    // bei Übungswechsel Index begrenzen
    if (index > exercises.length - 1) index = Math.max(0, exercises.length - 1);
  });

  function go(i) {
    index = Math.min(Math.max(0, i), exercises.length - 1);
  }

  function onPointerDown(e) {
    // nicht wischen, wenn in einem Eingabefeld gestartet wird
    if (e.target.closest("input")) return;
    dragging = true;
    startX = e.clientX;
    dragDX = 0;
    trackW = track?.offsetWidth || 1;
  }
  function onPointerMove(e) {
    if (!dragging) return;
    dragDX = e.clientX - startX;
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    const threshold = trackW * 0.2;
    if (dragDX <= -threshold) go(index + 1);
    else if (dragDX >= threshold) go(index - 1);
    dragDX = 0;
  }

  let offsetPct = $derived(
    -index * 100 + (dragging ? (dragDX / trackW) * 100 : 0),
  );

  let done = $state(false);

  // numeric fields are stored as numbers (for stats), time/pace stay strings.
  const NUMERIC = new Set(["reps", "weight", "hr", "power"]);

  // Eingetragene Werte als Log-Übungen aufbereiten und speichern. Danach gilt
  // das Training als erledigt -> Kasten bleibt grün, Cool-down erscheint.
  function save() {
    const out = [];
    for (const ex of exercises) {
      const v = values[ex.id];
      if (!v) continue;
      const note = (v.note ?? "").trim();
      const sets = [];
      for (const raw of v.sets ?? []) {
        const set = {};
        for (const [k, rawVal] of Object.entries(raw)) {
          const val = String(rawVal ?? "").trim();
          if (val === "") continue;
          if (NUMERIC.has(k)) {
            const n = Number(val);
            if (!Number.isNaN(n)) set[k] = n;
          } else {
            set[k] = val;
          }
        }
        if (Object.keys(set).length) sets.push(set);
      }
      if (sets.length || note) {
        out.push({ name: ex.label, sets, note });
      }
    }
    onsave?.(out);
    done = true;
    ondone?.();
  }
</script>

{#if exercises.length}
  <div class="swiper" class:done>
    <div class="sw-head">
      <span class="sw-title">
        {#if done}<span class="check" aria-hidden="true">✓</span>{/if}
        Training
      </span>
      <span class="sw-count">{index + 1} / {exercises.length}</span>
    </div>

    <div
      class="viewport"
      bind:this={track}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
    >
      <div
        class="track"
        class:dragging
        style="transform: translateX({offsetPct}%)"
      >
        {#each exercises as ex (ex.id)}
          <div class="card">
            <p class="ex-label">{ex.label}</p>
            {#if values[ex.id]}
              {#each values[ex.id].sets as set, si (si)}
                <div class="set">
                  {#if values[ex.id].sets.length > 1}
                    <span class="set-label">Satz {si + 1}</span>
                  {/if}
                  <div class="inputs">
                    {#each logFields as f (f)}
                      <label class="inp">
                        <span>{METRIC_META[f]?.label ?? f}</span>
                        <input
                          type={f === "time" || f === "pace" ? "text" : "number"}
                          inputmode={f === "time" || f === "pace" ? "text" : "decimal"}
                          bind:value={values[ex.id].sets[si][f]}
                          placeholder={METRIC_META[f]?.placeholder ?? "–"}
                        />
                      </label>
                    {/each}
                  </div>
                </div>
              {/each}
              <label class="ex-note">
                <span class="ex-note-label">Notiz</span>
                <textarea
                  rows="2"
                  bind:value={values[ex.id].note}
                  placeholder="z.B. Tempo, Pause, Gefühl …"
                ></textarea>
              </label>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <div class="dots">
      {#each exercises as ex, i (ex.id)}
        <button
          class="dot"
          class:active={i === index}
          onclick={() => go(i)}
          aria-label={`Übung ${i + 1}`}
        ></button>
      {/each}
    </div>

    <button class="save-btn" class:saved={done} onclick={save}>
      {#if done}
        <span class="check" aria-hidden="true">✓</span> Erledigt
      {:else}
        Training speichern
      {/if}
    </button>
  </div>
{/if}

<style>
  .swiper {
    margin-bottom: 12px;
    padding: 16px 18px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    animation: pop-in 0.22s cubic-bezier(0.22, 0.7, 0.3, 1);
    transition: background-color 0.25s, border-color 0.25s;
  }
  .swiper.done {
    background: var(--c-zone2-soft, rgba(95, 184, 122, 0.12));
    border-color: var(--c-zone2, #5fb87a);
  }
  .sw-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 700;
  }
  .swiper.done .sw-title {
    color: var(--c-zone2, #5fb87a);
  }
  .sw-title .check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--c-zone2, #5fb87a);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .sw-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .sw-count {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .viewport {
    overflow: hidden;
    touch-action: pan-y;
    cursor: grab;
  }
  .viewport:active {
    cursor: grabbing;
  }
  .track {
    display: flex;
    will-change: transform;
  }
  .track:not(.dragging) {
    transition: transform 0.28s cubic-bezier(0.22, 0.7, 0.3, 1);
  }
  .card {
    flex: 0 0 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 4px 2px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .ex-label {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
  }
  .ex-note {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ex-note-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-weight: 700;
  }
  .ex-note textarea {
    width: 100%;
    resize: vertical;
    padding: 12px;
    font-size: 14.5px;
  }
  .set {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .set-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-weight: 700;
  }
  .inputs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 12px;
  }
  .inp {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .inp span {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }
  .inp input {
    text-align: center;
    padding: 12px;
    font-size: 18px;
    font-weight: 700;
  }
  .dots {
    display: flex;
    justify-content: center;
    gap: 7px;
    margin-top: 16px;
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
  .save-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 16px;
    padding: 13px;
    background: var(--accent);
    border: none;
    border-radius: var(--radius);
    color: var(--on-accent);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.15s, background-color 0.25s;
  }
  .save-btn:hover {
    filter: brightness(1.08);
  }
  .save-btn.saved {
    background: var(--c-zone2, #5fb87a);
  }
  .save-btn .check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    font-size: 12px;
  }
</style>
