<script>
  import { untrack } from "svelte";
  import Modal from "./Modal.svelte";
  import TypeBadge from "./TypeBadge.svelte";
  import { logEntry, updateLogEntry, typeById } from "../store.svelte.js";
  import { parseYmd } from "../dateutil.js";
  import { metricsForSport } from "../sports.js";

  let { goal, dateStr, dayKey, onclose } = $props();

  // strength sessions (Kraft, Push/Pull, Ober-/Unterkörper …) are logged via
  // exercises & sets — the endurance metrics (Dauer/Distanz/Puls/RPE) make no
  // sense there, so we hide the "Werte" section for them. If the session has an
  // explicit modality, trust it; otherwise fall back to matching the type label.
  const sessionModality = goal.days?.[dayKey]?.session?.modality ?? null;
  const dayTypeLabel = typeById(goal, goal.days?.[dayKey]?.typeId)?.label ?? "";
  const isStrength = sessionModality
    ? sessionModality === "strength"
    : /kraft|strength|push|pull|bein|körper|hypertroph|maximalkraft|kraftausdauer|gewicht/i.test(
        dayTypeLabel,
      );

  // suggested metric fields come from the goal's sport; entry.metrics may also
  // hold custom keys the user added.
  const SUGGESTED = isStrength ? [] : metricsForSport(goal.sportId);

  // one-time snapshot of the entry (may not exist yet)
  let draft = $state(
    untrack(() => {
      const e = logEntry(goal, dateStr);
      const metrics = { ...(e?.metrics ?? {}) };
      const rows = [];
      for (const k of SUGGESTED) rows.push({ key: k, value: metrics[k] ?? "" });
      for (const [k, v] of Object.entries(metrics)) {
        if (!SUGGESTED.includes(k)) rows.push({ key: k, value: v });
      }
      // exercises with per-set reps/weight
      const exercises = (e?.exercises ?? []).map((ex) => ({
        name: ex.name ?? "",
        sets: (ex.sets ?? []).map((s) => ({
          reps: s.reps ?? "",
          weight: s.weight ?? "",
        })),
      }));
      return { note: e?.note ?? "", rows, exercises };
    }),
  );

  function addExercise() {
    draft.exercises = [
      ...draft.exercises,
      { name: "", sets: [{ reps: "", weight: "" }] },
    ];
  }
  function removeExercise(i) {
    draft.exercises = draft.exercises.filter((_, idx) => idx !== i);
  }
  function addSet(ex) {
    const last = ex.sets[ex.sets.length - 1];
    // copy weight from the previous set as a convenience
    ex.sets = [...ex.sets, { reps: "", weight: last?.weight ?? "" }];
  }
  function removeSet(ex, i) {
    ex.sets = ex.sets.filter((_, idx) => idx !== i);
  }

  let entry = $derived(logEntry(goal, dateStr));

  let prettyDate = $derived(
    parseYmd(dateStr).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  );

  function addRow() {
    draft.rows = [...draft.rows, { key: "", value: "" }];
  }
  function removeRow(i) {
    draft.rows = draft.rows.filter((_, idx) => idx !== i);
  }

  function save() {
    const metrics = {};
    for (const r of draft.rows) {
      const k = r.key.trim();
      const v = String(r.value).trim();
      if (k && v) metrics[k] = v;
    }
    // normalise exercises: keep named exercises, drop empty sets, coerce numbers
    const exercises = [];
    for (const ex of draft.exercises) {
      const name = ex.name.trim();
      if (!name) continue;
      const sets = [];
      for (const s of ex.sets) {
        const reps = s.reps === "" ? null : Number(s.reps);
        const weight = s.weight === "" ? null : Number(s.weight);
        if (reps == null && weight == null) continue;
        const set = {};
        if (reps != null && !Number.isNaN(reps)) set.reps = reps;
        if (weight != null && !Number.isNaN(weight)) set.weight = weight;
        if (Object.keys(set).length) sets.push(set);
      }
      if (sets.length) exercises.push({ name, sets });
    }
    updateLogEntry(
      goal.id,
      dateStr,
      { note: draft.note, metrics, exercises },
      dayKey,
    );
    onclose?.();
  }
</script>

<Modal title="Trainingsprotokoll" {onclose}>
  <div class="head">
    <div>
      <div class="date">{prettyDate}</div>
      {#if entry?.title}<div class="title">{entry.title}</div>{/if}
      {#if entry?.typeLabel}
        <div class="type-pill">
          <TypeBadge label={entry.typeLabel} color={entry.typeColor} size="sm" />
        </div>
      {/if}
    </div>
  </div>

  <div class="field">
      <label for="c-note">Notiz</label>
      <textarea
        id="c-note"
        bind:value={draft.note}
        rows="4"
        placeholder="Wie lief die Einheit? Gefühl, Wetter, Auffälligkeiten …"
      ></textarea>
    </div>

    <div class="exercises">
      <span class="caption">Übungen &amp; Sätze</span>
      {#each draft.exercises as ex, ei (ei)}
        <div class="exercise">
          <div class="ex-head">
            <input
              class="ex-name"
              bind:value={ex.name}
              placeholder="Übung (z.B. Klimmzüge)"
            />
            <button
              class="btn-ghost ex-del"
              onclick={() => removeExercise(ei)}
              aria-label="Übung entfernen">✕</button
            >
          </div>
          <div class="set-grid-head">
            <span>Satz</span>
            <span>Wdh</span>
            <span>kg</span>
            <span></span>
          </div>
          {#each ex.sets as set, si (si)}
            <div class="set-row">
              <span class="set-num">{si + 1}</span>
              <input
                class="set-in"
                type="number"
                inputmode="numeric"
                bind:value={set.reps}
                placeholder="–"
              />
              <input
                class="set-in"
                type="number"
                inputmode="decimal"
                bind:value={set.weight}
                placeholder="–"
              />
              <button
                class="btn-ghost set-del"
                onclick={() => removeSet(ex, si)}
                aria-label="Satz entfernen">✕</button
              >
            </div>
          {/each}
          <button class="btn btn-ghost btn-sm add" onclick={() => addSet(ex)}>
            + Satz
          </button>
        </div>
      {/each}
      <button class="btn btn-ghost btn-sm add" onclick={addExercise}>
        + Übung
      </button>
    </div>

    {#if !isStrength}
      <div class="metrics">
        <span class="caption">Werte</span>
        {#each draft.rows as row, i (i)}
          <div class="m-row">
            <input class="m-key" bind:value={row.key} placeholder="Kennzahl" />
            <input class="m-val" bind:value={row.value} placeholder="Wert" />
            <button
              class="btn-ghost m-del"
              onclick={() => removeRow(i)}
              aria-label="Wert entfernen">✕</button
            >
          </div>
        {/each}
        <button class="btn btn-ghost btn-sm add" onclick={addRow}>+ Wert</button>
      </div>
    {/if}

  <div class="actions">
    <button class="btn btn-ghost" onclick={() => onclose?.()}>Abbrechen</button>
    <button class="btn btn-primary" onclick={save}>Speichern</button>
  </div>
</Modal>

<style>
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }
  .date {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  .title {
    font-size: 15px;
    font-weight: 650;
    margin-top: 6px;
  }
  .type-pill {
    margin-top: 8px;
  }
  .field label {
    text-transform: none;
    letter-spacing: 0;
  }
  .exercises {
    margin-top: 16px;
  }
  .exercise {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    margin-bottom: 10px;
    background: var(--card);
  }
  .ex-head {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
  }
  .ex-name {
    flex: 1 1 auto;
    font-weight: 600;
  }
  .ex-del {
    flex: 0 0 auto;
    color: var(--text-dim);
    font-size: 13px;
  }
  .ex-del:hover {
    color: var(--c-danger, #e5534b);
  }
  .set-grid-head,
  .set-row {
    display: grid;
    grid-template-columns: 38px 1fr 1fr 32px;
    gap: 8px;
    align-items: center;
  }
  .set-grid-head {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-dim);
    margin-bottom: 6px;
  }
  .set-grid-head span {
    text-align: center;
  }
  .set-grid-head span:first-child {
    text-align: left;
  }
  .set-row {
    margin-bottom: 6px;
  }
  .set-num {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
  }
  .set-in {
    text-align: center;
    padding: 8px;
  }
  .set-del {
    color: var(--text-dim);
    font-size: 12px;
  }
  .set-del:hover {
    color: var(--c-danger, #e5534b);
  }
  .metrics {
    margin-top: 14px;
  }
  .caption {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .m-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;
  }
  .m-key {
    flex: 1 1 45%;
  }
  .m-val {
    flex: 1 1 45%;
  }
  .m-del {
    flex: 0 0 auto;
    color: var(--text-dim);
    font-size: 13px;
  }
  .m-del:hover {
    color: var(--c-danger, #e5534b);
  }
  .add {
    margin-top: 2px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }
  .empty {
    margin: 4px 0;
    font-size: 14px;
  }
</style>
