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

  const num = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const TYPES = [
    { id: "gel", label: "Gel" },
    { id: "drink", label: "Getränk" },
    { id: "snack", label: "Snack" },
    { id: "meal", label: "Mahlzeit" },
    { id: "bar", label: "Riegel" },
  ];
  const PHASE_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a78bfa", "#06b6d4", "#eab308", "#ef4444"];

  function phaseSub(p) {
    let carbs = 0, fluid = 0, sodium = 0, caffeine = 0;
    for (const it of p.items ?? []) {
      const q = num(it.qty);
      carbs += q * num(it.carbsG);
      fluid += q * num(it.fluidMl);
      sodium += q * num(it.sodiumMg);
      caffeine += q * num(it.caffeineMg);
    }
    return { carbs, fluid, sodium, caffeine };
  }
  const phaseGph = (p) => (num(p.durationH) > 0 ? Math.round(phaseSub(p).carbs / num(p.durationH)) : null);

  let totals = $derived.by(() => {
    const t = { carbs: 0, fluid: 0, sodium: 0, caffeine: 0 };
    for (const p of plan.phases) {
      const s = phaseSub(p);
      t.carbs += s.carbs; t.fluid += s.fluid; t.sodium += s.sodium; t.caffeine += s.caffeine;
    }
    return t;
  });
  let totalDur = $derived(plan.phases.reduce((a, p) => a + num(p.durationH), 0));
  let target = $derived(num(plan.targetGph));
  let rate = $derived(totalDur > 0 ? Math.round(totals.carbs / totalDur) : null);
  let rateClass = $derived(
    rate == null || !target ? "" : rate < target * 0.8 ? "rate-warn" : rate > target * 1.2 ? "rate-over" : "rate-ok",
  );

  // HYROX starter template — mapped to the app's item model (qty × per-unit;
  // drinks keep an explicit fluidMl). Only offered when the plan is empty.
  const HYROX_TEMPLATE = [
    { name: "3–4h vor dem Start", dur: 3, items: [
      { type: "meal", name: "Haferflocken + Banane", qty: 1, carbsG: 65, sodiumMg: 120, caffeineMg: 0, fluidMl: 0 },
      { type: "drink", name: "Wasser", qty: 1, carbsG: 0, sodiumMg: 20, caffeineMg: 0, fluidMl: 500 },
    ] },
    { name: "1h vor dem Start", dur: 1, items: [
      { type: "snack", name: "Granola Bar", qty: 1, carbsG: 28, sodiumMg: 80, caffeineMg: 0, fluidMl: 0 },
      { type: "drink", name: "Elektrolyt-Drink", qty: 1, carbsG: 8, sodiumMg: 300, caffeineMg: 0, fluidMl: 250 },
    ] },
    { name: "Warm-up / Startblock", dur: 0.5, items: [
      { type: "gel", name: "Caffeine Gel", qty: 1, carbsG: 22, sodiumMg: 55, caffeineMg: 75, fluidMl: 0 },
    ] },
    { name: "Mid-Race", dur: 1, items: [
      { type: "gel", name: "Energy Gel", qty: 1, carbsG: 22, sodiumMg: 55, caffeineMg: 0, fluidMl: 0 },
      { type: "drink", name: "Wasser Roxzone", qty: 1, carbsG: 0, sodiumMg: 10, caffeineMg: 0, fluidMl: 200 },
    ] },
    { name: "1h nach dem Ziel", dur: 1, items: [
      { type: "drink", name: "Protein Shake", qty: 1, carbsG: 30, sodiumMg: 200, caffeineMg: 0, fluidMl: 350 },
      { type: "drink", name: "Elektrolyt-Drink", qty: 1, carbsG: 12, sodiumMg: 500, caffeineMg: 0, fluidMl: 500 },
    ] },
  ];
  function loadTemplate() {
    // clear pristine (item-less) phases first so the template doesn't pile up
    if (plan.phases.every((p) => !(p.items?.length))) {
      for (const p of [...plan.phases]) deleteRacePhase(p.id);
    }
    for (const ph of HYROX_TEMPLATE) {
      const p = addRacePhase(ph.name);
      updateRacePhase(p.id, { durationH: ph.dur });
      for (const it of ph.items) addRaceItem(p.id, it);
    }
    if (!num(plan.targetGph)) setRaceMeta({ targetGph: 45 });
  }

  const TIPS = [
    { cls: "t-orange", html: "<b>Carbs/Stunde:</b> 30–60 g/h für Rennen über 60 min (Gels, Trockenfrüchte, Sportdrinks)" },
    { cls: "t-cyan", html: "<b>Hydration:</b> 125–180 ml Wasser alle 15–20 min; Wasserstationen in der Roxzone nutzen" },
    { cls: "t-yellow", html: "<b>Natrium:</b> Elektrolyt-Getränke bei Hitze und starkem Schwitzen empfohlen" },
    { cls: "t-purple", html: "<b>Koffein:</b> Pre-Race-Gel mit ~75 mg Koffein ~30–45 min vor dem Start" },
    { cls: "t-green", html: "<b>Post-Race:</b> Innerhalb 30–60 min nach dem Ziel mit Protein + Carbs refuelen" },
    { cls: "t-orange", html: "<b>Carb-Loading:</b> Bei Rennen über 90 min 2–3 Tage vorher die Kohlenhydrate erhöhen" },
  ];
</script>

<div class="race">
  <div class="page-header">
    <div>
      <div class="page-title">Nutrition-Strategie</div>
      <div class="page-sub">Plane deine Energie- und Flüssigkeitszufuhr für den Wettkampftag</div>
    </div>
  </div>

  <!-- Race selector -->
  <div class="race-bar">
    <span class="rb-label">Wettkampf</span>
    <button class="race-btn selected">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
      HYROX
    </button>
    <button class="race-btn placeholder" disabled title="Bald verfügbar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
      Marathon
    </button>
    <div class="rb-divider"></div>
    <span class="rb-dur">Gesamtdauer: <b>{totalDur ? totalDur + " h" : "–"}</b></span>
    <div class="target-group">
      <label for="tgph">Ziel Carbs/h</label>
      <input id="tgph" type="number" min="0" max="120" value={plan.targetGph} oninput={(e) => setRaceMeta({ targetGph: e.target.value })} />
      <span>g</span>
    </div>
  </div>

  <!-- Summary -->
  <div class="summary">
    <div class="sum-card sc-carbs"><div class="sum-l">Gesamt Carbs</div><div class="sum-v">{totals.carbs}</div><div class="sum-u">g</div></div>
    <div class="sum-card sc-fluid"><div class="sum-l">Flüssigkeit</div><div class="sum-v">{totals.fluid}</div><div class="sum-u">ml</div></div>
    <div class="sum-card sc-sodium"><div class="sum-l">Natrium</div><div class="sum-v">{totals.sodium}</div><div class="sum-u">mg</div></div>
    <div class="sum-card sc-caffeine"><div class="sum-l">Koffein</div><div class="sum-v">{totals.caffeine}</div><div class="sum-u">mg</div></div>
    <div class="sum-card sc-rate"><div class="sum-l">Carbs/Stunde</div><div class="sum-v {rateClass}">{rate ?? "–"}</div><div class="sum-u">g/h</div><div class="sum-hint">Ziel: {target || "–"} g/h</div></div>
  </div>

  <!-- Phases -->
  <div class="phases-head">
    <div class="phases-title">Phasen</div>
    <div class="phases-actions">
      <button class="btn-template-sm" onclick={loadTemplate}>HYROX-Vorlage laden</button>
      <button class="btn-add-phase" onclick={() => addRacePhase()}>+ Phase hinzufügen</button>
    </div>
  </div>

  {#if plan.phases.length}
    <div class="phases-grid">
      {#each plan.phases as phase, pi (phase.id)}
        {@const s = phaseSub(phase)}
        <div class="phase-card">
          <div class="phase-header">
            <div class="dot" style="background:{PHASE_COLORS[pi % PHASE_COLORS.length]}"></div>
            <input class="phase-name" type="text" value={phase.name} oninput={(e) => updateRacePhase(phase.id, { name: e.target.value })} />
            <div class="dur-group">
              <input class="dur-input" type="number" min="0" step="0.5" value={phase.durationH} oninput={(e) => updateRacePhase(phase.id, { durationH: e.target.value })} />h
            </div>
            <button class="icon-btn del" onclick={() => deleteRacePhase(phase.id)} aria-label="Phase löschen">✕</button>
          </div>

          <div class="items">
            {#each phase.items as it (it.id)}
              <div class="item">
                <div class="item-top">
                  <select class="t-select" value={it.type} onchange={(e) => updateRaceItem(phase.id, it.id, { type: e.target.value })}>
                    {#each TYPES as t (t.id)}<option value={t.id}>{t.label}</option>{/each}
                    {#if it.type && !TYPES.some((t) => t.id === it.type)}<option value={it.type}>{it.type}</option>{/if}
                  </select>
                  <input class="n-input" type="text" placeholder="Name / Produkt" value={it.name} oninput={(e) => updateRaceItem(phase.id, it.id, { name: e.target.value })} />
                  <button class="icon-btn" onclick={() => deleteRaceItem(phase.id, it.id)} aria-label="Eintrag löschen">✕</button>
                </div>
                <div class="nums">
                  <label class="num"><span>Menge</span><input type="number" min="0" value={it.qty} oninput={(e) => updateRaceItem(phase.id, it.id, { qty: e.target.value })} /></label>
                  <label class="num"><span style="color:var(--orange)">Carbs g</span><input type="number" min="0" value={it.carbsG} oninput={(e) => updateRaceItem(phase.id, it.id, { carbsG: e.target.value })} /></label>
                  <label class="num"><span style="color:var(--cyan)">ml</span><input type="number" min="0" value={it.fluidMl} oninput={(e) => updateRaceItem(phase.id, it.id, { fluidMl: e.target.value })} /></label>
                  <label class="num"><span style="color:var(--yellow)">Na mg</span><input type="number" min="0" value={it.sodiumMg} oninput={(e) => updateRaceItem(phase.id, it.id, { sodiumMg: e.target.value })} /></label>
                  <label class="num"><span style="color:var(--purple)">Koff mg</span><input type="number" min="0" value={it.caffeineMg} oninput={(e) => updateRaceItem(phase.id, it.id, { caffeineMg: e.target.value })} /></label>
                </div>
              </div>
            {/each}
            <button class="btn-add-item" onclick={() => addRaceItem(phase.id, {})}>+ Item hinzufügen</button>
          </div>

          <div class="subtotal">
            <span class="chip" style="color:var(--orange)"><b>{s.carbs}</b> g</span>
            <span class="chip" style="color:var(--cyan)"><b>{s.fluid}</b> ml</span>
            <span class="chip" style="color:var(--yellow)"><b>{s.sodium}</b> mg Na</span>
            <span class="chip" style="color:var(--purple)"><b>{s.caffeine}</b> mg Kaff</span>
            {#if phaseGph(phase) != null}<span class="chip" style="color:var(--green)">{phaseGph(phase)} g/h</span>{/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty-line">Noch keine Phasen — „HYROX-Vorlage laden" oder „+ Phase hinzufügen".</p>
  {/if}

  <!-- Tips -->
  <div class="tips">
    <div class="tips-title">HYROX Nutrition-Richtwerte</div>
    <div class="tips-grid">
      {#each TIPS as t (t.html)}<div class="tip {t.cls}">{@html t.html}</div>{/each}
    </div>
  </div>
</div>

<style>
  .race {
    --surface: var(--color-card, #161b25);
    --surface-2: var(--color-surface-2, #1c2333);
    --surface-3: var(--color-surface-3, #222b3a);
    --border: var(--color-line, rgba(255,255,255,0.07));
    --border-md: var(--color-line-strong, rgba(255,255,255,0.11));
    --text: var(--color-ink, #e2e8f0);
    --text-muted: var(--color-ink-muted, #64748b);
    --text-faint: var(--color-ink-dim, #334155);
    --green: var(--c-success, #22c55e);
    --orange: var(--c-streak, #f97316);
    --cyan: var(--c-cyan, #06b6d4);
    --purple: var(--c-purple, #a78bfa);
    --yellow: #eab308;
    --red: #ef4444;
    --r: 10px;
    --r-sm: 7px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .race :global(b) { font-weight: 600; }
  .page-title { font-size: 22px; font-weight: 800; color: var(--text); }
  .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 3px; }

  .race-bar { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 12px 18px; flex-wrap: wrap; }
  .rb-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .race-btn { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: var(--r-sm); font-size: 13px; font-weight: 600; border: 1px solid var(--border-md); background: transparent; color: var(--text-muted); cursor: pointer; font-family: var(--font); }
  .race-btn svg { width: 15px; height: 15px; }
  .race-btn:hover:not(.placeholder) { background: var(--surface-2); color: var(--text); }
  .race-btn.selected { background: rgba(var(--accent-rgb), 0.15); color: var(--accent); border-color: var(--accent); }
  .race-btn.placeholder { opacity: 0.4; cursor: not-allowed; }
  .rb-divider { width: 1px; height: 22px; background: var(--border); }
  .rb-dur { font-size: 11px; color: var(--text-muted); }
  .rb-dur b { color: var(--text); }
  .target-group { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .target-group label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
  .target-group input { width: 58px; background: var(--surface-2); border: 1px solid var(--border-md); color: var(--text); border-radius: var(--r-sm); padding: 5px 8px; font-size: 13px; font-family: var(--mono); text-align: center; }
  .target-group input:focus { outline: none; border-color: var(--accent); }
  .target-group span { font-size: 12px; color: var(--text-muted); }

  .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .sum-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
  .sum-l { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
  .sum-v { font-size: 24px; font-weight: 700; font-family: var(--mono); line-height: 1.1; }
  .sum-u { font-size: 11px; color: var(--text-muted); }
  .sum-hint { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
  .sc-carbs .sum-v { color: var(--orange); }
  .sc-fluid .sum-v { color: var(--cyan); }
  .sc-sodium .sum-v { color: var(--yellow); }
  .sc-caffeine .sum-v { color: var(--purple); }
  .sc-rate .sum-v { color: var(--green); }
  .sum-v.rate-ok { color: var(--green); }
  .sum-v.rate-warn { color: var(--yellow); }
  .sum-v.rate-over { color: var(--red); }

  .phases-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .phases-title { font-size: 14px; font-weight: 700; color: var(--text); }
  .btn-add-phase { padding: 7px 13px; border-radius: var(--r-sm); background: rgba(var(--accent-rgb), 0.15); color: var(--accent); border: 1px solid rgba(var(--accent-rgb), 0.25); font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font); }
  .btn-add-phase:hover { background: rgba(var(--accent-rgb), 0.25); }

  .phases-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .phase-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); display: flex; flex-direction: column; overflow: hidden; }
  .phase-header { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--border); }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .phase-name { flex: 1; min-width: 0; background: transparent; border: none; color: var(--text); font-size: 13px; font-weight: 600; font-family: var(--font); padding: 0; }
  .phase-name:focus { outline: none; }
  .dur-group { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }
  .dur-input { width: 40px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 5px; color: var(--text); font-size: 11px; font-family: var(--mono); padding: 3px 5px; text-align: center; }
  .dur-input:focus { outline: none; border-color: var(--accent); }
  .icon-btn { background: none; border: none; color: var(--text-faint); cursor: pointer; padding: 3px 5px; border-radius: 5px; font-size: 13px; line-height: 1; }
  .icon-btn:hover { color: var(--red); }

  .items { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .item { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 9px 10px; display: flex; flex-direction: column; gap: 6px; }
  .item-top { display: flex; align-items: center; gap: 6px; }
  .t-select { background: var(--surface-3); border: 1px solid var(--border); color: var(--text); font-size: 11px; border-radius: 5px; padding: 4px 6px; font-family: var(--font); cursor: pointer; flex-shrink: 0; }
  .t-select:focus { outline: none; border-color: var(--accent); }
  .n-input { flex: 1; min-width: 0; background: var(--surface-3); border: 1px solid var(--border); color: var(--text); font-size: 11px; border-radius: 5px; padding: 4px 7px; font-family: var(--font); }
  .n-input:focus { outline: none; border-color: var(--accent); }
  .nums { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .num { display: flex; flex-direction: column; gap: 2px; }
  .num span { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; }
  .num input { background: var(--surface-3); border: 1px solid var(--border); color: var(--text); font-size: 11px; font-family: var(--mono); border-radius: 5px; padding: 4px 6px; text-align: right; width: 100%; }
  .num input:focus { outline: none; border-color: var(--accent); }
  .btn-add-item { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 10px; border-radius: var(--r-sm); background: none; border: 1px dashed var(--border-md); color: var(--text-muted); font-size: 11px; cursor: pointer; font-family: var(--font); }
  .btn-add-item:hover { border-color: var(--accent); color: var(--accent); background: rgba(var(--accent-rgb), 0.12); }

  .subtotal { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 12px 10px; border-top: 1px solid var(--border); margin-top: auto; }
  .chip { font-size: 10px; font-family: var(--mono); padding: 2px 7px; border-radius: 99px; border: 1px solid var(--border); background: var(--surface-3); }

  .phases-actions { display: flex; gap: 8px; }
  .btn-template-sm { padding: 7px 13px; border-radius: var(--r-sm); background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border-md); font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font); }
  .btn-template-sm:hover { color: var(--accent); border-color: var(--accent); }
  .empty-line { font-size: 13px; color: var(--text-muted); padding: 6px 2px; }

  .tips { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 16px 20px; }
  .tips-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); margin-bottom: 10px; }
  .tips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; }
  .tip { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 8px 12px; font-size: 11.5px; color: var(--text-muted); line-height: 1.5; }
  .tip :global(b) { color: var(--text); }
  .t-orange { border-left: 2px solid var(--orange); }
  .t-cyan { border-left: 2px solid var(--cyan); }
  .t-yellow { border-left: 2px solid var(--yellow); }
  .t-purple { border-left: 2px solid var(--purple); }
  .t-green { border-left: 2px solid var(--green); }

  @media (max-width: 900px) {
    .summary { grid-template-columns: repeat(2, 1fr); }
  }
</style>
