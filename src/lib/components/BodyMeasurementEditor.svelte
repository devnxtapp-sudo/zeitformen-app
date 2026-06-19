<script>
  import { untrack } from "svelte";
  import { Button, Input, Label, Textarea } from "flowbite-svelte";
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
  <div class="mb-3.5">
    <Label
      for="bm-date"
      class="mb-1.5 block text-xs font-semibold text-ink-muted"
    >
      Datum
    </Label>
    <Input id="bm-date" type="date" bind:value={draft.date} />
  </div>

  <span
    class="mb-2 mt-3.5 block text-xs font-bold uppercase tracking-wide text-primary-400"
  >
    Kernwerte
  </span>
  <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
    {#each CORE_METRICS as m (m.id)}
      <div class="flex flex-col gap-1.5">
        <Label for="bm-{m.id}" class="text-xs font-medium text-ink-muted">
          {m.label}{m.unit ? ` (${m.unit})` : ""}
        </Label>
        <Input
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

  <span
    class="mb-2 mt-3.5 block text-xs font-bold uppercase tracking-wide text-primary-400"
  >
    Weitere Werte
  </span>
  <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
    {#each OPTIONAL_METRICS as m (m.id)}
      <div class="flex flex-col gap-1.5">
        <Label for="bm-{m.id}" class="text-xs font-medium text-ink-muted">
          {m.label}{m.unit ? ` (${m.unit})` : ""}
        </Label>
        <Input
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

  <div class="mt-4">
    <Label
      for="bm-note"
      class="mb-1.5 block text-xs font-semibold text-ink-muted"
    >
      Notiz
    </Label>
    <Textarea
      id="bm-note"
      bind:value={draft.note}
      rows={3}
      placeholder="z.B. nüchtern gemessen, morgens …"
    />
  </div>

  <div class="mt-[18px] flex items-center gap-2.5">
    {#if entry}
      <Button color="red" onclick={remove}>Löschen</Button>
    {/if}
    <span class="flex-1"></span>
    <Button
      color="alternative"
      class="border-transparent bg-transparent"
      onclick={() => onclose?.()}
    >
      Abbrechen
    </Button>
    <Button
      color="primary"
      class="font-semibold text-[var(--on-accent)]"
      onclick={save}
    >
      Speichern
    </Button>
  </div>
</Modal>
