<script>
  import { state as store } from "../store.svelte.js";
  import {
    setNutritionTargets,
    addMeal,
    updateMeal,
    deleteMeal,
  } from "../store.svelte.js";
  import { parseYmd, todayKey } from "../dateutil.js";

  let { onback } = $props();

  // selected day for the meal log (defaults to today)
  let date = $state(todayKey());

  const MACROS = [
    { id: "kcal", label: "Kalorien", short: "kcal", unit: "kcal" },
    { id: "protein", label: "Protein", short: "Protein", unit: "g" },
    { id: "carbs", label: "Kohlenhydrate", short: "KH", unit: "g" },
    { id: "fat", label: "Fett", short: "Fett", unit: "g" },
  ];

  let targets = $derived(store.nutrition.targets);
  let meals = $derived(store.nutrition.days?.[date]?.meals ?? []);

  // running totals for the selected day
  let totals = $derived.by(() => {
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const m of meals) {
      for (const k of Object.keys(t)) {
        const v = Number(m[k]);
        if (!Number.isNaN(v)) t[k] += v;
      }
    }
    return t;
  });

  function pct(have, goal) {
    const g = Number(goal);
    if (!g) return 0;
    return Math.min(100, Math.round((have / g) * 100));
  }

  function longDate(d) {
    return parseYmd(d).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }
</script>

<div class="nutrition">
  <div class="head">
    <div class="head-title">
      <button class="back" onclick={() => onback?.()} aria-label="Zurück">‹</button>
      <div>
        <h2>Ernährungsplan</h2>
        <span class="sub muted">Makro-Ziele & Tagesplan</span>
      </div>
    </div>
  </div>

  <section class="panel">
    <h3>Tagesziele</h3>
    <div class="targets-grid">
      {#each MACROS as m (m.id)}
        <label class="field">
          <span class="field-lbl">{m.label}</span>
          <span class="field-input">
            <input
              type="number"
              inputmode="decimal"
              min="0"
              placeholder="–"
              value={targets[m.id] ?? ""}
              oninput={(e) => setNutritionTargets({ [m.id]: e.target.value })}
            />
            <span class="field-unit">{m.unit}</span>
          </span>
        </label>
      {/each}
    </div>
  </section>

  <section class="panel">
    <div class="panel-head">
      <h3>Tagesplan</h3>
      <input
        class="date-input"
        type="date"
        value={date}
        oninput={(e) => (date = e.target.value)}
      />
    </div>
    <span class="day-label muted">{longDate(date)}</span>

    <div class="summary">
      {#each MACROS as m (m.id)}
        <div class="sum">
          <div class="sum-top">
            <span class="sum-lbl">{m.short}</span>
            <span class="sum-val">
              {totals[m.id]}{#if targets[m.id]}<span class="sum-goal"> / {targets[m.id]}</span>{/if}
            </span>
          </div>
          <div class="bar">
            <div class="bar-fill" style="width: {pct(totals[m.id], targets[m.id])}%"></div>
          </div>
        </div>
      {/each}
    </div>

    <div class="meals">
      {#each meals as meal (meal.id)}
        <div class="meal">
          <div class="meal-row">
            <input
              class="meal-name"
              type="text"
              placeholder="Mahlzeit"
              value={meal.name}
              oninput={(e) => updateMeal(date, meal.id, { name: e.target.value })}
            />
            <button
              class="meal-del"
              onclick={() => deleteMeal(date, meal.id)}
              aria-label="Mahlzeit löschen"
            >×</button>
          </div>
          <div class="meal-macros">
            {#each MACROS as m (m.id)}
              <label class="mm">
                <span class="mm-lbl">{m.short}</span>
                <input
                  type="number"
                  inputmode="decimal"
                  min="0"
                  placeholder="–"
                  value={meal[m.id] ?? ""}
                  oninput={(e) => updateMeal(date, meal.id, { [m.id]: e.target.value })}
                />
              </label>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <button class="btn btn-ghost add-meal" onclick={() => addMeal(date, {})}>
      + Mahlzeit
    </button>
  </section>
</div>

<style>
  .nutrition {
    margin-bottom: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .head-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .back {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 22px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .back:hover {
    border-color: var(--c-zone2);
  }
  .head h2 {
    font-size: 20px;
  }
  .sub {
    font-size: 12px;
    display: block;
    margin-top: 2px;
  }
  .panel {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
  }
  .panel h3 {
    font-size: 15px;
    margin-bottom: 14px;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 4px;
  }
  .panel-head h3 {
    margin-bottom: 0;
  }
  .day-label {
    font-size: 12px;
    display: block;
    margin-bottom: 14px;
    text-transform: capitalize;
  }
  .date-input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 13px;
    padding: 6px 10px;
  }
  .targets-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .field-lbl {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .field-input {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 10px;
  }
  .field-input input {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: var(--text);
    font-size: 16px;
    font-weight: 600;
    padding: 9px 0;
  }
  .field-input input:focus {
    outline: none;
  }
  .field-unit {
    font-size: 11px;
    color: var(--text-dim);
  }
  .summary {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .sum-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 5px;
  }
  .sum-lbl {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .sum-val {
    font-size: 14px;
    font-weight: 700;
  }
  .sum-goal {
    color: var(--text-dim);
    font-weight: 500;
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--bg);
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: var(--c-zone2);
    border-radius: 3px;
    transition: width 0.2s;
  }
  .meals {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .meal {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .meal-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .meal-name {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
    padding: 4px 0;
  }
  .meal-name:focus {
    outline: none;
    border-bottom-color: var(--c-zone2);
  }
  .meal-del {
    flex: 0 0 auto;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg-elev);
    color: var(--text-muted);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
  }
  .meal-del:hover {
    color: var(--c-danger, #e5534b);
    border-color: var(--c-danger, #e5534b);
  }
  .meal-macros {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .mm {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .mm-lbl {
    font-size: 10px;
    color: var(--text-dim);
    text-transform: uppercase;
  }
  .mm input {
    width: 100%;
    min-width: 0;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 14px;
    padding: 7px 8px;
  }
  .mm input:focus {
    outline: none;
    border-color: var(--c-zone2);
  }
  .add-meal {
    margin-top: 12px;
    width: 100%;
  }
</style>
