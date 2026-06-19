<script>
  import { untrack } from "svelte";
  import { Button, Input, Label, Textarea } from "flowbite-svelte";
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
  <div class="mb-4 flex items-start justify-between gap-3">
    <div>
      <div class="text-[13px] text-ink-muted">{prettyDate}</div>
      {#if entry?.title}
        <div class="mt-1.5 text-[15px] font-semibold text-ink">{entry.title}</div>
      {/if}
      {#if entry?.typeLabel}
        <div class="mt-2">
          <TypeBadge label={entry.typeLabel} color={entry.typeColor} size="sm" />
        </div>
      {/if}
    </div>
  </div>

  <div class="mb-3.5">
    <Label
      for="c-note"
      class="mb-1.5 block text-sm font-medium normal-case tracking-normal text-ink-muted"
      >Notiz</Label
    >
    <Textarea
      id="c-note"
      bind:value={draft.note}
      rows={4}
      placeholder="Wie lief die Einheit? Gefühl, Wetter, Auffälligkeiten …"
    />
  </div>

  <div class="mt-4">
    <span
      class="mb-2 block text-xs font-bold uppercase tracking-wide text-primary-400"
      >Übungen &amp; Sätze</span
    >
    {#each draft.exercises as ex, ei (ei)}
      <div class="mb-2.5 rounded-xl border border-line bg-card p-3">
        <div class="mb-2.5 flex items-center gap-2">
          <Input
            class="flex-1 font-semibold"
            bind:value={ex.name}
            placeholder="Übung (z.B. Klimmzüge)"
          />
          <Button
            color="alternative"
            class="shrink-0 border-transparent bg-transparent !p-2 text-[13px] text-ink-dim hover:text-[var(--c-danger,#e5534b)]"
            onclick={() => removeExercise(ei)}
            aria-label="Übung entfernen">✕</Button
          >
        </div>
        <div
          class="mb-1.5 grid grid-cols-[38px_1fr_1fr_32px] items-center gap-2 text-[10.5px] uppercase tracking-[0.04em] text-ink-dim"
        >
          <span>Satz</span>
          <span class="text-center">Wdh</span>
          <span class="text-center">kg</span>
          <span></span>
        </div>
        {#each ex.sets as set, si (si)}
          <div
            class="mb-1.5 grid grid-cols-[38px_1fr_1fr_32px] items-center gap-2"
          >
            <span class="text-center text-[13px] text-ink-muted">{si + 1}</span>
            <Input
              class="!p-2 text-center"
              type="number"
              inputmode="numeric"
              bind:value={set.reps}
              placeholder="–"
            />
            <Input
              class="!p-2 text-center"
              type="number"
              inputmode="decimal"
              bind:value={set.weight}
              placeholder="–"
            />
            <Button
              color="alternative"
              class="border-transparent bg-transparent !p-2 text-xs text-ink-dim hover:text-[var(--c-danger,#e5534b)]"
              onclick={() => removeSet(ex, si)}
              aria-label="Satz entfernen">✕</Button
            >
          </div>
        {/each}
        <Button
          size="sm"
          color="alternative"
          class="mt-0.5 border-transparent bg-transparent"
          onclick={() => addSet(ex)}>+ Satz</Button
        >
      </div>
    {/each}
    <Button
      size="sm"
      color="alternative"
      class="mt-0.5 border-transparent bg-transparent"
      onclick={addExercise}>+ Übung</Button
    >
  </div>

  {#if !isStrength}
    <div class="mt-3.5">
      <span
        class="mb-2 block text-xs font-bold uppercase tracking-wide text-primary-400"
        >Werte</span
      >
      {#each draft.rows as row, i (i)}
        <div class="mb-2 flex items-center gap-2">
          <Input class="flex-1" bind:value={row.key} placeholder="Kennzahl" />
          <Input class="flex-1" bind:value={row.value} placeholder="Wert" />
          <Button
            color="alternative"
            class="shrink-0 border-transparent bg-transparent !p-2 text-[13px] text-ink-dim hover:text-[var(--c-danger,#e5534b)]"
            onclick={() => removeRow(i)}
            aria-label="Wert entfernen">✕</Button
          >
        </div>
      {/each}
      <Button
        size="sm"
        color="alternative"
        class="mt-0.5 border-transparent bg-transparent"
        onclick={addRow}>+ Wert</Button
      >
    </div>
  {/if}

  <div class="mt-[18px] flex justify-end gap-2.5">
    <Button
      color="alternative"
      class="border-transparent bg-transparent"
      onclick={() => onclose?.()}>Abbrechen</Button
    >
    <Button
      color="primary"
      class="font-semibold text-[var(--on-accent)]"
      onclick={save}>Speichern</Button
    >
  </div>
</Modal>
