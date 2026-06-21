<script>
  import { untrack } from "svelte";
  import Modal from "./Modal.svelte";
  import { DAY_LABELS, MODALITIES, modalityById, emptyExtraSession } from "../seed.js";
  import { updateDay, typeById } from "../store.svelte.js";
  import { Button, Input, Select, Textarea, Label, Toggle } from "flowbite-svelte";

  let { goal, dayKey, onclose } = $props();

  // Ensure the structured-session fields exist (older entries) and pre-select
  // the strength modality for clearly strength-based types.
  function normalizeSession(s, typeId) {
    if (!("modality" in s)) s.modality = null;
    if (!Array.isArray(s.intervals)) s.intervals = [];
    if (!("intensity" in s)) s.intensity = "";
    if (!Array.isArray(s.blocks)) s.blocks = [];
    if (!s.modality) {
      const label = typeById(goal, typeId)?.label ?? "";
      if (/kraft|strength|push|pull|bein|körper|hypertroph|maximalkraft|kraftausdauer|gewicht/i.test(label)) {
        s.modality = "strength";
      }
    }
  }

  // deep copy so edits are only committed on save (one-time snapshot of props)
  let draft = $state(
    untrack(() => {
      const d = JSON.parse(JSON.stringify(goal.days[dayKey]));
      if (!Array.isArray(d.extraSessions)) d.extraSessions = [];
      normalizeSession(d.session, d.typeId);
      for (const ex of d.extraSessions) {
        if (!ex.session) ex.session = { objective: "", blocks: [], bonus: "" };
        normalizeSession(ex.session, ex.typeId);
      }
      return d;
    }),
  );

  // 0 = primary day session, n>0 = the n-th extra session (Doppelsession).
  let activeSlot = $state(0);
  // The session carrier currently being edited. Day and extra-session objects
  // share the same typeId/title/meta/session shape, so the form can bind to it.
  let cur = $derived(
    activeSlot === 0 ? draft : draft.extraSessions[activeSlot - 1] ?? draft,
  );
  let curRest = $derived(activeSlot === 0 && draft.isRest);

  let modality = $derived(modalityById(cur.session.modality));
  let isStrength = $derived(cur.session.modality === "strength");
  // Ohne gewählte Modalität: einfache Übungsliste (Name + Sätze + Wdh + kg).
  let freeform = $derived(!cur.session.modality);
  let exStrength = $derived(isStrength || freeform);
  let planFields = $derived(modality?.plan ?? ["amount", "weight"]);
  let amountUnits = $derived(modality?.amountUnits ?? ["Wdh"]);

  function pickModality(id) {
    cur.session.modality = cur.session.modality === id ? null : id;
  }

  // Tag zwischen Ruhetag und Trainingstag umschalten (nur Primär-Session).
  function setRest(v) {
    draft.isRest = v;
    if (v) {
      draft.title = "Ruhetag";
      draft.meta = "Ruhetag";
    } else if (draft.title === "Ruhetag") {
      draft.title = "";
      draft.meta = "";
    }
  }

  function addSession() {
    const ex = emptyExtraSession();
    normalizeSession(ex.session, ex.typeId);
    draft.extraSessions.push(ex);
    activeSlot = draft.extraSessions.length;
  }
  function removeSession() {
    const idx = activeSlot - 1;
    if (idx < 0) return;
    draft.extraSessions.splice(idx, 1);
    activeSlot = 0;
  }

  function addInterval() {
    cur.session.intervals.push({
      name: "",
      repeat: 1,
      amount: "",
      amountUnit: amountUnits[0] ?? "Wdh",
      weight: "",
      rest: "",
      restUnit: "s",
    });
  }
  function removeInterval(i) {
    cur.session.intervals.splice(i, 1);
  }

  function cleanSession(s) {
    for (const b of s.blocks) {
      b.items = b.items.filter((x) => x.trim() !== "");
    }
    s.blocks = s.blocks.filter((b) => b.title.trim() !== "" || b.items.length);
    s.intervals = s.intervals.filter(
      (iv) =>
        String(iv.name ?? "").trim() !== "" ||
        String(iv.amount).trim() !== "" ||
        String(iv.weight).trim() !== "",
    );
  }

  function save() {
    cleanSession(draft.session);
    for (const ex of draft.extraSessions) cleanSession(ex.session);
    updateDay(goal.id, dayKey, draft);
    onclose?.();
  }
</script>

<Modal title={`${DAY_LABELS[dayKey]} bearbeiten`} {onclose}>
  {#if activeSlot === 0}
    <label class="mb-3.5 flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
      <span class="text-sm font-semibold text-ink">Ruhetag</span>
      <Toggle checked={draft.isRest} onchange={(e) => setRest(e.target.checked)} />
    </label>
  {/if}
  {#if !draft.isRest}
    <div class="mb-3.5 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors duration-100 {activeSlot ===
        0
          ? 'border-primary-500 bg-primary-500 text-[var(--on-accent)]'
          : 'border-line bg-card text-ink hover:border-primary-500'}"
        onclick={() => (activeSlot = 0)}
      >Session 1</button>
      {#each draft.extraSessions as _, i (i)}
        <button
          type="button"
          class="rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors duration-100 {activeSlot ===
          i + 1
            ? 'border-primary-500 bg-primary-500 text-[var(--on-accent)]'
            : 'border-line bg-card text-ink hover:border-primary-500'}"
          onclick={() => (activeSlot = i + 1)}
        >Session {i + 2}</button>
      {/each}
      {#if draft.extraSessions.length < 1}
        <button
          type="button"
          class="rounded-full border border-line bg-card px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-400 transition-colors duration-100 hover:border-primary-500"
          onclick={addSession}
        >+ Session</button>
      {/if}
    </div>
    {#if activeSlot > 0}
      <button
        type="button"
        class="cursor-pointer border-none bg-none px-0 pb-3 text-xs font-semibold text-ink-muted hover:text-ink"
        onclick={removeSession}
      >Diese Session entfernen</button>
    {/if}
  {/if}

  {#if !curRest}
    <div class="mb-3.5">
      <Label for="d-type" class="mb-1.5 block text-xs font-semibold text-ink-muted">Trainingstyp</Label>
      <Select id="d-type" placeholder="" bind:value={cur.typeId}>
        <option value={null}>— kein Typ —</option>
        {#each goal.types as t (t.id)}
          <option value={t.id}>{t.label}</option>
        {/each}
      </Select>
    </div>
  {/if}

  <div class="mb-3.5">
    <Label for="d-title" class="mb-1.5 block text-xs font-semibold text-ink-muted">Titel</Label>
    <Input
      id="d-title"
      bind:value={cur.title}
      placeholder={isStrength ? "z.B. Oberkörper, Unterkörper" : "z.B. Grundlagenausdauer"}
    />
  </div>

  <div class="mb-3.5">
    <Label for="d-meta" class="mb-1.5 block text-xs font-semibold text-ink-muted">Untertitel / Dauer</Label>
    <Input
      id="d-meta"
      bind:value={cur.meta}
      placeholder={isStrength ? "z.B. 90 min" : "z.B. 60–120 min · 60–65 % HFmax"}
    />
  </div>

  {#if !curRest}
    {#if !isStrength}
      <div class="mb-3.5">
        <Label for="d-obj" class="mb-1.5 block text-xs font-semibold text-ink-muted">Ziel</Label>
        <Textarea id="d-obj" rows={3} bind:value={cur.session.objective} />
      </div>
    {/if}

    <div class="mb-3.5">
      <span class="mb-2 block text-xs font-semibold text-ink-muted">Modalität</span>
      <div class="flex flex-wrap gap-2">
        {#each MODALITIES as m (m.id)}
          <button
            type="button"
            class="rounded-full border px-3.5 py-2 text-[13.5px] font-semibold transition-colors duration-100 {cur
              .session.modality === m.id
              ? 'border-primary-500 bg-primary-500 text-[var(--on-accent)]'
              : 'border-line bg-card text-ink hover:border-primary-500'}"
            onclick={() => pickModality(m.id)}
          >
            {m.label}
          </button>
        {/each}
      </div>
    </div>

    {#if modality}
      <div class="mb-3.5">
        <Label for="d-intensity" class="mb-1.5 block text-xs font-semibold text-ink-muted">Intensität / Zielbereich</Label>
        <Input
          id="d-intensity"
          bind:value={cur.session.intensity}
          placeholder="z.B. 80–85 % HFmax · Schwellentempo"
        />
      </div>
    {/if}

    <div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-semibold text-ink-muted">{exStrength ? "Übungen" : "Intervalle"}</span>
          <Button size="sm" color="alternative" onclick={addInterval}>
            {exStrength ? "+ Übung" : "+ Intervall"}
          </Button>
        </div>

        {#each cur.session.intervals as iv, i (i)}
          <div class="mb-2.5 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-card p-3">
            {#if exStrength}
              <Input
                class="basis-full font-semibold"
                bind:value={iv.name}
                placeholder="Übung (z.B. Bankdrücken)"
              />
            {/if}
            <label class="flex min-w-0 flex-[1_1_56px] flex-col gap-1">
              <span class="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">{exStrength ? "Sätze" : "Anzahl"}</span>
              <Input type="number" inputmode="numeric" min="1" bind:value={iv.repeat} placeholder="1" />
            </label>
            <span class="self-center pb-2.5 font-bold text-ink-muted">×</span>
            {#if planFields.includes("amount")}
              <label class="flex min-w-0 flex-[1_1_56px] flex-col gap-1">
                <span class="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">{exStrength ? "Wdh" : "Menge"}</span>
                <Input type="number" inputmode="decimal" bind:value={iv.amount} placeholder="–" />
              </label>
              <label class="flex min-w-0 flex-[0_0_72px] flex-col gap-1">
                <span class="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Einheit</span>
                <Select placeholder="" bind:value={iv.amountUnit}>
                  {#each amountUnits as u (u)}
                    <option value={u}>{u}</option>
                  {/each}
                </Select>
              </label>
            {/if}
            {#if planFields.includes("weight")}
              <label class="flex min-w-0 flex-[1_1_56px] flex-col gap-1">
                <span class="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">kg</span>
                <Input type="number" inputmode="decimal" bind:value={iv.weight} placeholder="–" />
              </label>
            {/if}
            {#if planFields.includes("rest")}
              <label class="flex min-w-0 flex-[1_1_56px] flex-col gap-1">
                <span class="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Pause</span>
                <Input type="number" inputmode="numeric" bind:value={iv.rest} placeholder="–" />
              </label>
              <label class="flex min-w-0 flex-[0_0_72px] flex-col gap-1">
                <span class="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">&nbsp;</span>
                <Select placeholder="" bind:value={iv.restUnit}>
                  <option value="s">s</option>
                  <option value="min">min</option>
                </Select>
              </label>
            {/if}
            <Button
              size="sm"
              color="alternative"
              class="ml-auto self-center border-transparent bg-transparent !p-2 text-ink-muted hover:text-ink"
              onclick={() => removeInterval(i)}
              aria-label="Intervall entfernen"
            >✕</Button>
          </div>
        {/each}
    </div>

    <div class="mb-3.5 mt-3.5">
      <Label for="d-bonus" class="mb-1.5 block text-xs font-semibold text-ink-muted">Bonus / Hinweis</Label>
      <Textarea id="d-bonus" rows={3} bind:value={cur.session.bonus} />
    </div>
  {/if}

  <div class="mt-[18px] flex justify-end gap-2.5">
    <Button color="alternative" class="border-transparent bg-transparent" onclick={() => onclose?.()}>Abbrechen</Button>
    <Button color="primary" class="font-semibold text-[var(--on-accent)]" onclick={save}>Speichern</Button>
  </div>
</Modal>
