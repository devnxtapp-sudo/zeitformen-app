<script>
  import { untrack } from "svelte";
  import Modal from "./Modal.svelte";
  import { DAY_LABELS, MODALITIES, modalityById, emptyExtraSession } from "../seed.js";
  import { updateDay, typeById } from "../store.svelte.js";

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
  let planFields = $derived(modality?.plan ?? []);
  let amountUnits = $derived(modality?.amountUnits ?? ["min"]);
  let isStrength = $derived(cur.session.modality === "strength");

  function pickModality(id) {
    cur.session.modality = cur.session.modality === id ? null : id;
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
    const m = modalityById(cur.session.modality);
    cur.session.intervals.push({
      name: "",
      repeat: 1,
      amount: "",
      amountUnit: m?.amountUnits?.[0] ?? "min",
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
  {#if !draft.isRest}
    <div class="sess-tabs">
      <button
        type="button"
        class="sess-tab"
        class:active={activeSlot === 0}
        onclick={() => (activeSlot = 0)}
      >Session 1</button>
      {#each draft.extraSessions as _, i (i)}
        <button
          type="button"
          class="sess-tab"
          class:active={activeSlot === i + 1}
          onclick={() => (activeSlot = i + 1)}
        >Session {i + 2}</button>
      {/each}
      {#if draft.extraSessions.length < 1}
        <button type="button" class="sess-tab add" onclick={addSession}>+ Session</button>
      {/if}
    </div>
    {#if activeSlot > 0}
      <button type="button" class="sess-del" onclick={removeSession}>Diese Session entfernen</button>
    {/if}
  {/if}

  {#if !curRest}
    <div class="field">
      <label for="d-type">Trainingstyp</label>
      <select id="d-type" bind:value={cur.typeId}>
        <option value={null}>— kein Typ —</option>
        {#each goal.types as t (t.id)}
          <option value={t.id}>{t.label}</option>
        {/each}
      </select>
    </div>
  {/if}

  <div class="field">
    <label for="d-title">Titel</label>
    <input
      id="d-title"
      bind:value={cur.title}
      placeholder={isStrength ? "z.B. Oberkörper, Unterkörper" : "z.B. Grundlagenausdauer"}
    />
  </div>

  <div class="field">
    <label for="d-meta">Untertitel / Dauer</label>
    <input
      id="d-meta"
      bind:value={cur.meta}
      placeholder={isStrength ? "z.B. 90 min" : "z.B. 60–120 min · 60–65 % HFmax"}
    />
  </div>

  {#if !curRest}
    {#if !isStrength}
      <div class="field">
        <label for="d-obj">Ziel</label>
        <textarea id="d-obj" bind:value={cur.session.objective}></textarea>
      </div>
    {/if}

    <div class="field">
      <span class="caption">Modalität</span>
      <div class="mod-chips">
        {#each MODALITIES as m (m.id)}
          <button
            type="button"
            class="mod-chip"
            class:active={cur.session.modality === m.id}
            onclick={() => pickModality(m.id)}
          >
            {m.label}
          </button>
        {/each}
      </div>
    </div>

    {#if modality}
      <div class="field">
        <label for="d-intensity">Intensität / Zielbereich</label>
        <input
          id="d-intensity"
          bind:value={cur.session.intensity}
          placeholder="z.B. 80–85 % HFmax · Schwellentempo"
        />
      </div>

      <div class="blocks">
        <div class="blocks-head">
          <span class="caption">{isStrength ? "Übungen" : "Intervalle"}</span>
          <button class="btn btn-sm" onclick={addInterval}>
            {isStrength ? "+ Übung" : "+ Intervall"}
          </button>
        </div>

        {#each cur.session.intervals as iv, i (i)}
          <div class="interval">
            {#if isStrength}
              <input
                class="iv-name"
                bind:value={iv.name}
                placeholder="Übung (z.B. Bankdrücken)"
              />
            {/if}
            <label class="iv-cell iv-repeat">
              <span>{modality.id === "strength" ? "Sätze" : "Anzahl"}</span>
              <input type="number" inputmode="numeric" min="1" bind:value={iv.repeat} placeholder="1" />
            </label>
            <span class="iv-x">×</span>
            {#if planFields.includes("amount")}
              <label class="iv-cell iv-amount">
                <span>{modality.id === "strength" ? "Wdh" : "Menge"}</span>
                <input type="number" inputmode="decimal" bind:value={iv.amount} placeholder="–" />
              </label>
              <label class="iv-cell iv-unit">
                <span>Einheit</span>
                <select bind:value={iv.amountUnit}>
                  {#each amountUnits as u (u)}
                    <option value={u}>{u}</option>
                  {/each}
                </select>
              </label>
            {/if}
            {#if planFields.includes("weight")}
              <label class="iv-cell iv-weight">
                <span>kg</span>
                <input type="number" inputmode="decimal" bind:value={iv.weight} placeholder="–" />
              </label>
            {/if}
            {#if planFields.includes("rest")}
              <label class="iv-cell iv-rest">
                <span>Pause</span>
                <input type="number" inputmode="numeric" bind:value={iv.rest} placeholder="–" />
              </label>
              <label class="iv-cell iv-unit">
                <span>&nbsp;</span>
                <select bind:value={iv.restUnit}>
                  <option value="s">s</option>
                  <option value="min">min</option>
                </select>
              </label>
            {/if}
            <button class="btn btn-sm btn-ghost iv-del" onclick={() => removeInterval(i)} aria-label="Intervall entfernen">✕</button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="field" style="margin-top:14px;">
      <label for="d-bonus">Bonus / Hinweis</label>
      <textarea id="d-bonus" bind:value={cur.session.bonus}></textarea>
    </div>
  {/if}

  <div class="actions">
    <button class="btn btn-ghost" onclick={() => onclose?.()}>Abbrechen</button>
    <button class="btn btn-primary" onclick={save}>Speichern</button>
  </div>
</Modal>

<style>
  .field label {
    text-transform: none;
    letter-spacing: 0;
  }
  .sess-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .sess-tab {
    padding: 7px 14px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text);
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s, color 0.12s;
  }
  .sess-tab:hover {
    border-color: var(--accent);
  }
  .sess-tab.active {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }
  .sess-tab.add {
    color: var(--accent);
  }
  .sess-del {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 12.5px;
    font-weight: 600;
    padding: 0 0 12px;
    cursor: pointer;
  }
  .blocks-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .caption {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .blocks-head .caption {
    margin-bottom: 0;
  }
  .mod-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .mod-chip {
    padding: 8px 13px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text);
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s, color 0.12s;
  }
  .mod-chip:hover {
    border-color: var(--accent);
  }
  .mod-chip.active {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }
  .interval {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px;
    margin-bottom: 10px;
    background: var(--card);
  }
  .iv-name {
    flex: 1 1 100%;
    font-weight: 600;
    padding: 9px 10px;
    font-size: 14px;
  }
  .iv-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .iv-cell span {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    font-weight: 700;
  }
  .iv-cell input,
  .iv-cell select {
    padding: 8px 9px;
    font-size: 14px;
  }
  .iv-repeat,
  .iv-amount,
  .iv-weight,
  .iv-rest {
    flex: 1 1 56px;
  }
  .iv-unit {
    flex: 0 0 64px;
  }
  .iv-x {
    align-self: center;
    padding-bottom: 9px;
    color: var(--text-muted);
    font-weight: 700;
  }
  .iv-del {
    align-self: center;
    margin-left: auto;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }
</style>
