<script>
  import { untrack } from "svelte";
  import Modal from "./Modal.svelte";
  import { CORE_METRICS, OPTIONAL_METRICS } from "../bodyMetrics.js";
  import {
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
  } from "../store.svelte.js";

  // `entry` is null for a new measurement, or an existing measurement to edit.
  let { entry = null, onclose } = $props();

  const today = new Date().toISOString().slice(0, 10);

  let draft = $state(
    untrack(() => {
      const metrics = { ...(entry?.metrics ?? {}) };
      const rows = {};
      for (const m of [...CORE_METRICS, ...OPTIONAL_METRICS]) {
        rows[m.id] = metrics[m.id] ?? "";
      }
      return { date: entry?.date ?? today, note: entry?.note ?? "", rows };
    }),
  );

  function save() {
    const metrics = {};
    for (const [k, v] of Object.entries(draft.rows)) {
      const s = String(v).trim();
      if (s === "") continue;
      const n = Number(s.replace(",", "."));
      metrics[k] = Number.isNaN(n) ? s : n;
    }
    if (entry) {
      updateMeasurement(entry.id, {
        date: draft.date,
        note: draft.note.trim(),
        metrics,
      });
    } else {
      addMeasurement({ date: draft.date, note: draft.note.trim(), metrics });
    }
    onclose?.();
  }

  function remove() {
    if (!entry) return;
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    deleteMeasurement(entry.id);
    onclose?.();
  }
</script>

<Modal title={entry ? "Messung bearbeiten" : "Neue Messung"} {onclose}>
  <div class="field">
    <label for="bm-date">Datum</label>
    <input id="bm-date" type="date" bind:value={draft.date} />
  </div>

  <span class="caption">Kernwerte</span>
  <div class="grid">
    {#each CORE_METRICS as m (m.id)}
      <div class="m-field">
        <label for="bm-{m.id}">{m.label}{m.unit ? ` (${m.unit})` : ""}</label>
        <input
          id="bm-{m.id}"
          type="number"
          inputmode="decimal"
          step={m.step}
          bind:value={draft.rows[m.id]}
          placeholder="–"
        />
      </div>
    {/each}
  </div>

  <span class="caption">Weitere Werte</span>
  <div class="grid">
    {#each OPTIONAL_METRICS as m (m.id)}
      <div class="m-field">
        <label for="bm-{m.id}">{m.label}{m.unit ? ` (${m.unit})` : ""}</label>
        <input
          id="bm-{m.id}"
          type="number"
          inputmode="decimal"
          step={m.step}
          bind:value={draft.rows[m.id]}
          placeholder="–"
        />
      </div>
    {/each}
  </div>

  <div class="field note">
    <label for="bm-note">Notiz</label>
    <textarea
      id="bm-note"
      bind:value={draft.note}
      rows="3"
      placeholder="z.B. nüchtern gemessen, morgens …"
    ></textarea>
  </div>

  <div class="actions">
    {#if entry}
      <button class="btn btn-danger" onclick={remove}>Löschen</button>
    {/if}
    <span class="spacer"></span>
    <button class="btn btn-ghost" onclick={() => onclose?.()}>Abbrechen</button>
    <button class="btn btn-primary" onclick={save}>Speichern</button>
  </div>
</Modal>

<style>
  .field label {
    text-transform: none;
    letter-spacing: 0;
  }
  .caption {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin: 14px 0 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .m-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .m-field label {
    font-size: 12px;
    color: var(--text-muted);
  }
  .m-field input {
    text-align: left;
  }
  .note {
    margin-top: 16px;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
  }
  .spacer {
    flex: 1 1 auto;
  }
  @media (max-width: 480px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
