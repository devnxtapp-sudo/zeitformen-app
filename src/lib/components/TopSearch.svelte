<script>
  import { exerciseNames, WEEKDAYS } from "../stats.js";
  import Search from "@lucide/svelte/icons/search";

  let { goal, onselect } = $props();

  const PAGES = [
    { label: "Dashboard", view: "dashboard", kw: "übersicht home start" },
    { label: "Wochenplan", view: "week", kw: "plan woche training einheiten" },
    { label: "Kalender", view: "calendar", kw: "monat termine" },
    { label: "Statistik", view: "stats", kw: "auswertung charts pace pr bestleistung volumen" },
    { label: "Körperanalyse", view: "body", kw: "gewicht inbody körper messung" },
    { label: "Pace-Rechner", view: "pace", kw: "rechner tempo geschwindigkeit" },
    { label: "Intervall-Timer", view: "timer", kw: "timer hiit tabata" },
    { label: "Ernährungsplan", view: "nutrition", kw: "essen makros kalorien" },
    { label: "Nutrition-Strategie", view: "racenutrition", kw: "wettkampf race gel verpflegung" },
    { label: "Packliste", view: "packlist", kw: "wettkampf tasche checkliste" },
  ];

  let q = $state("");
  let open = $state(false);
  let idx = $state(0);

  let results = $derived.by(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const out = [];
    for (const p of PAGES) {
      if (p.label.toLowerCase().includes(query) || p.kw.includes(query))
        out.push({ group: "Seiten", label: p.label, view: p.view });
    }
    for (const name of exerciseNames(goal)) {
      if (name.toLowerCase().includes(query))
        out.push({ group: "Übungen", label: name, view: "stats", exercise: name });
    }
    const seen = new Set();
    for (const wd of WEEKDAYS) {
      const d = goal?.days?.[wd.key];
      const t = (goal?.types ?? []).find((x) => x.id === d?.typeId);
      const lbl = t?.label || d?.title;
      if (lbl && !seen.has(lbl) && lbl.toLowerCase().includes(query)) {
        seen.add(lbl);
        out.push({ group: "Trainingstage", label: lbl, view: "week" });
      }
    }
    return out.slice(0, 8);
  });

  $effect(() => {
    // keep highlight in range as results change
    results;
    if (idx >= results.length) idx = 0;
  });

  function choose(r) {
    if (!r) return;
    onselect?.(r.view, r.exercise ? { exercise: r.exercise } : null);
    q = "";
    open = false;
  }

  function onkeydown(e) {
    if (!results.length) {
      if (e.key === "Escape") { q = ""; open = false; }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); idx = (idx + 1) % results.length; }
    else if (e.key === "ArrowUp") { e.preventDefault(); idx = (idx - 1 + results.length) % results.length; }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[idx]); }
    else if (e.key === "Escape") { q = ""; open = false; }
  }
</script>

<div class="search-wrap">
  <div class="search-box">
    <Search size={14} aria-hidden="true" />
    <input
      type="text"
      placeholder="Suchen …"
      bind:value={q}
      onfocus={() => (open = true)}
      onblur={() => setTimeout(() => (open = false), 120)}
      onkeydown={onkeydown}
    />
  </div>

  {#if open && results.length}
    <div class="search-pop">
      {#each results as r, i (r.group + r.label)}
        {#if i === 0 || results[i - 1].group !== r.group}
          <div class="search-group">{r.group}</div>
        {/if}
        <button
          class="search-item"
          class:active={i === idx}
          onmousedown={(e) => { e.preventDefault(); choose(r); }}
          onmouseenter={() => (idx = i)}
        >
          <span class="search-label">{r.label}</span>
          <span class="search-go">↵</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search-wrap { position: relative; }
  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 2px 11px;
    width: 220px;
    max-width: 46vw;
    color: var(--text-muted);
  }
  .search-box:focus-within { border-color: var(--border-md, rgba(255,255,255,0.18)); }
  .search-box input {
    background: none; border: none; outline: none;
    color: var(--text); font-size: 13px; font-family: var(--font); width: 100%;
  }
  .search-box input::placeholder { color: var(--text-muted); }

  .search-pop {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    width: 320px;
    max-width: 80vw;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.45);
    padding: 6px;
    z-index: 50;
    max-height: 60vh;
    overflow-y: auto;
  }
  .search-group {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--text-dim); padding: 8px 8px 4px;
  }
  .search-item {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    width: 100%; text-align: left; background: none; border: none; cursor: pointer;
    padding: 8px 10px; border-radius: 7px; color: var(--text); font-size: 13px; font-family: var(--font);
  }
  .search-item.active { background: rgba(var(--accent-rgb), 0.15); color: var(--accent); }
  .search-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .search-go { font-size: 11px; color: var(--text-dim); flex-shrink: 0; }
  .search-item.active .search-go { color: var(--accent); }
</style>
