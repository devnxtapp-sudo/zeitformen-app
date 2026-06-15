<script>
  import { state as store } from "../store.svelte.js";
  import {
    setRaceMeta,
    addRacePhase,
    updateRacePhase,
    deleteRacePhase,
    addRaceItem,
    updateRaceItem,
    deleteRaceItem,
  } from "../store.svelte.js";

  let { onback } = $props();

  let plan = $derived(store.raceNutrition);

  // which item is currently expanded for editing (one at a time)
  let editingId = $state(null);

  const num = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const itemCarbs = (it) => num(it.qty) * num(it.carbsG);

  function phaseSum(p, key) {
    let t = 0;
    for (const it of p.items) t += num(it.qty) * num(it[key]);
    return t;
  }
  const phaseCarbs = (p) => phaseSum(p, "carbsG");

  function phaseGph(p) {
    const d = num(p.durationH);
    if (!d) return null;
    return Math.round(phaseCarbs(p) / d);
  }

  let totals = $derived.by(() => {
    const t = { carbsG: 0, fluidMl: 0, sodiumMg: 0, caffeineMg: 0 };
    for (const p of plan.phases) {
      for (const k of Object.keys(t)) t[k] += phaseSum(p, k);
    }
    return t;
  });

  let overallGph = $derived.by(() => {
    const d = num(plan.durationH);
    if (!d) return null;
    return Math.round(totals.carbsG / d);
  });

  // colour the big g/h green once we reach the target
  let onTarget = $derived(
    overallGph != null &&
      num(plan.targetGph) > 0 &&
      overallGph >= num(plan.targetGph),
  );

  function itemSubtitle(it) {
    const parts = [];
    if (it.type) parts.push(it.type);
    if (num(it.sodiumMg)) parts.push(`${it.sodiumMg} mg Na`);
    if (num(it.fluidMl)) parts.push(`${it.fluidMl} ml`);
    if (num(it.caffeineMg)) parts.push(`${it.caffeineMg} mg Koffein`);
    return parts.join(" · ");
  }

  function addItem(phaseId) {
    const it = addRaceItem(phaseId, {});
    editingId = it.id;
  }
</script>

<div class="race-nut">
  <div class="topbar">
    <button class="ico-btn" onclick={() => onback?.()} aria-label="Zurück">‹</button>
    <h2>Nutrition-Strategie</h2>
    <span class="ico-btn flask" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
        <path d="M7 14h10" />
      </svg>
    </span>
  </div>

  <section class="hero">
    <input
      class="race-name"
      type="text"
      placeholder="Wettkampf benennen"
      value={plan.raceName}
      oninput={(e) => setRaceMeta({ raceName: e.target.value })}
    />
    <div class="hero-main">
      <div class="gph" class:good={onTarget}>
        <span class="gph-num">{overallGph ?? "–"}</span>
        <span class="gph-unit">g/h</span>
      </div>
      <div class="goal-pill">
        <span class="flag" aria-hidden="true">⚑</span>
        Ziel {plan.targetGph || "–"} g/h
      </div>
    </div>

    <div class="totals">
      <div class="tot"><span class="tot-num">{totals.carbsG}</span><span class="tot-unit">g</span><span class="tot-lbl">Carbs</span></div>
      <div class="tot"><span class="tot-num">{totals.fluidMl}</span><span class="tot-unit">ml</span><span class="tot-lbl">Flüssigkeit</span></div>
      <div class="tot"><span class="tot-num">{totals.sodiumMg}</span><span class="tot-unit">mg</span><span class="tot-lbl">Natrium</span></div>
      <div class="tot"><span class="tot-num">{totals.caffeineMg}</span><span class="tot-unit">mg</span><span class="tot-lbl">Koffein</span></div>
    </div>

    <div class="meta-edit">
      <label class="me">
        <span>Ziel g/h</span>
        <input type="number" inputmode="decimal" min="0" placeholder="–"
          value={plan.targetGph} oninput={(e) => setRaceMeta({ targetGph: e.target.value })} />
      </label>
      <label class="me">
        <span>Dauer (h)</span>
        <input type="number" inputmode="decimal" min="0" step="0.25" placeholder="–"
          value={plan.durationH} oninput={(e) => setRaceMeta({ durationH: e.target.value })} />
      </label>
    </div>
  </section>

  {#each plan.phases as phase (phase.id)}
    <section class="phase">
      <div class="phase-head">
        <input
          class="phase-name"
          type="text"
          value={phase.name}
          oninput={(e) => updateRacePhase(phase.id, { name: e.target.value })}
        />
        {#if phaseGph(phase) != null}
          <span class="phase-gph">{phaseGph(phase)} g/h</span>
        {/if}
        <button class="phase-del" onclick={() => deleteRacePhase(phase.id)} aria-label="Phase löschen">×</button>
      </div>

      <label class="phase-dur">
        <span>Dauer (h)</span>
        <input type="number" inputmode="decimal" min="0" step="0.25" placeholder="–"
          value={phase.durationH} oninput={(e) => updateRacePhase(phase.id, { durationH: e.target.value })} />
      </label>

      <div class="items">
        {#each phase.items as it (it.id)}
          <div class="item" class:open={editingId === it.id}>
            <button class="item-row" onclick={() => (editingId = editingId === it.id ? null : it.id)}>
              <span class="qty">{num(it.qty)}×</span>
              <span class="item-main">
                <span class="item-name">{it.name || "Eintrag"}</span>
                {#if itemSubtitle(it)}<span class="item-sub">{itemSubtitle(it)}</span>{/if}
              </span>
              <span class="item-carbs">{itemCarbs(it)} g</span>
            </button>

            {#if editingId === it.id}
              <div class="item-edit">
                <label class="fe wide"><span>Name</span>
                  <input type="text" value={it.name}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { name: e.target.value })} /></label>
                <label class="fe wide"><span>Art</span>
                  <input type="text" placeholder="z. B. Gel, Getränk / Mix" value={it.type}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { type: e.target.value })} /></label>
                <label class="fe"><span>Menge</span>
                  <input type="number" inputmode="numeric" min="0" value={it.qty}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { qty: e.target.value })} /></label>
                <label class="fe"><span>Carbs (g)</span>
                  <input type="number" inputmode="decimal" min="0" value={it.carbsG}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { carbsG: e.target.value })} /></label>
                <label class="fe"><span>Flüssigkeit (ml)</span>
                  <input type="number" inputmode="numeric" min="0" value={it.fluidMl}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { fluidMl: e.target.value })} /></label>
                <label class="fe"><span>Natrium (mg)</span>
                  <input type="number" inputmode="numeric" min="0" value={it.sodiumMg}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { sodiumMg: e.target.value })} /></label>
                <label class="fe"><span>Koffein (mg)</span>
                  <input type="number" inputmode="numeric" min="0" value={it.caffeineMg}
                    oninput={(e) => updateRaceItem(phase.id, it.id, { caffeineMg: e.target.value })} /></label>
                <button class="item-rm" onclick={() => { deleteRaceItem(phase.id, it.id); editingId = null; }}>
                  Eintrag löschen
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <button class="add-item" onclick={() => addItem(phase.id)}>+ Eintrag</button>
    </section>
  {/each}

  <button class="add-phase" onclick={() => addRacePhase()}>+ Phase</button>
</div>

<style>
  .race-nut {
    margin-bottom: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .topbar h2 {
    flex: 1;
    text-align: center;
    font-size: 18px;
  }
  .ico-btn {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: none;
    background: var(--accent, #f0a830);
    color: #1a1205;
    font-size: 22px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .ico-btn.flask {
    cursor: default;
  }
  .hero {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .race-name {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0;
  }
  .race-name:focus {
    outline: none;
    color: var(--text);
  }
  .hero-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .gph {
    display: flex;
    align-items: baseline;
    gap: 4px;
    color: var(--text);
  }
  .gph.good .gph-num {
    color: var(--c-zone2, #5fb87a);
  }
  .gph-num {
    font-size: 40px;
    font-weight: 800;
    line-height: 1;
  }
  .gph-unit {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .goal-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(91, 141, 239, 0.14);
    color: var(--accent2, #5b8def);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .totals {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }
  .tot {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .tot-num {
    font-size: 18px;
    font-weight: 700;
  }
  .tot-unit {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: -2px;
  }
  .tot-lbl {
    font-size: 10px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .meta-edit {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .me, .phase-dur {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .me > span, .phase-dur > span {
    font-size: 11px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .me input, .phase-dur input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
    padding: 8px 10px;
  }
  .me input:focus, .phase-dur input:focus {
    outline: none;
    border-color: var(--c-zone2);
  }
  .phase {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .phase-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .phase-name {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: var(--text);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0;
  }
  .phase-name:focus {
    outline: none;
  }
  .phase-gph {
    flex: 0 0 auto;
    font-size: 13px;
    font-weight: 700;
    color: var(--accent2, #5b8def);
  }
  .phase-del {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text-muted);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }
  .phase-del:hover {
    color: var(--c-danger, #e5534b);
    border-color: var(--c-danger, #e5534b);
  }
  .phase-dur {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  .phase-dur input {
    width: 90px;
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .item {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .item.open {
    border-color: var(--c-zone2);
  }
  .item-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    background: none;
    border: none;
    color: var(--text);
    text-align: left;
    padding: 11px 12px;
    cursor: pointer;
  }
  .qty {
    flex: 0 0 auto;
    background: rgba(91, 141, 239, 0.16);
    color: var(--accent2, #5b8def);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 13px;
    font-weight: 700;
  }
  .item-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .item-name {
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item-sub {
    font-size: 12px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item-carbs {
    flex: 0 0 auto;
    font-size: 15px;
    font-weight: 700;
  }
  .item-edit {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 0 12px 12px;
  }
  .fe {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fe.wide {
    grid-column: 1 / -1;
  }
  .fe > span {
    font-size: 10px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .fe input {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 14px;
    padding: 8px;
  }
  .fe input:focus {
    outline: none;
    border-color: var(--c-zone2);
  }
  .item-rm {
    grid-column: 1 / -1;
    background: none;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--c-danger, #e5534b);
    font-size: 13px;
    font-weight: 600;
    padding: 9px;
    cursor: pointer;
  }
  .item-rm:hover {
    border-color: var(--c-danger, #e5534b);
  }
  .add-item {
    background: none;
    border: 1px dashed var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    padding: 10px;
    cursor: pointer;
  }
  .add-item:hover {
    border-color: var(--c-zone2);
    color: var(--c-zone2);
  }
  .add-phase {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    padding: 13px;
    cursor: pointer;
  }
  .add-phase:hover {
    border-color: var(--c-zone2);
  }
</style>
