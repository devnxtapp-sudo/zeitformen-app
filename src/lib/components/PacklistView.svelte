<script>
  import { state } from "../store.svelte.js";
  import {
    setPacklistMeta,
    addPacklistCategory,
    updatePacklistCategory,
    deletePacklistCategory,
    addPacklistItem,
    updatePacklistItem,
    togglePacklistItem,
    deletePacklistItem,
  } from "../store.svelte.js";

  let { onback } = $props();

  let plan = $derived(state.packlist);

  let stats = $derived.by(() => {
    let total = 0;
    let done = 0;
    for (const c of plan.categories) {
      for (const it of c.items) {
        total++;
        if (it.done) done++;
      }
    }
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  });
</script>

<div class="packlist">
  <div class="topbar">
    <h2>Packliste</h2>
  </div>

  <section class="hero">
    <input
      class="race-name"
      type="text"
      placeholder="Wettkampf benennen"
      value={plan.raceName}
      oninput={(e) => setPacklistMeta({ raceName: e.target.value })}
    />
    <div class="hero-main">
      <span class="pct">{stats.pct}%</span>
      <span class="count">{stats.done} von {stats.total} erledigt</span>
    </div>
    <div class="bar">
      <div class="bar-fill" style="width: {stats.pct}%"></div>
    </div>
  </section>

  {#each plan.categories as cat (cat.id)}
    <section class="cat">
      <div class="cat-head">
        <input
          class="cat-name"
          type="text"
          value={cat.name}
          oninput={(e) => updatePacklistCategory(cat.id, { name: e.target.value })}
        />
        <button class="cat-del" onclick={() => deletePacklistCategory(cat.id)} aria-label="Kategorie löschen">×</button>
      </div>

      <div class="items">
        {#each cat.items as it (it.id)}
          <div class="item" class:done={it.done}>
            <button class="check" onclick={() => togglePacklistItem(cat.id, it.id)} aria-pressed={it.done} aria-label="Erledigt umschalten">
              {#if it.done}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              {/if}
            </button>
            <input
              class="item-label"
              type="text"
              value={it.label}
              placeholder="Eintrag"
              oninput={(e) => updatePacklistItem(cat.id, it.id, { label: e.target.value })}
            />
            <button class="item-del" onclick={() => deletePacklistItem(cat.id, it.id)} aria-label="Eintrag löschen">×</button>
          </div>
        {/each}
      </div>

      <button class="add-item" onclick={() => addPacklistItem(cat.id, "")}>+ Eintrag</button>
    </section>
  {/each}

  <button class="add-cat" onclick={() => addPacklistCategory()}>+ Kategorie</button>
</div>

<style>
  .packlist {
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
    font-size: 18px;
  }
  .hero {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
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
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .pct {
    font-size: 34px;
    font-weight: 800;
    line-height: 1;
  }
  .count {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 600;
  }
  .bar {
    height: 8px;
    border-radius: 4px;
    background: var(--bg);
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: var(--accent, #f0a830);
    border-radius: 4px;
    transition: width 0.2s;
  }
  .cat {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cat-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }
  .cat-name {
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
  .cat-name:focus {
    outline: none;
  }
  .cat-del {
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
  .cat-del:hover {
    color: var(--c-danger, #e5534b);
    border-color: var(--c-danger, #e5534b);
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .check {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 2px solid var(--border);
    background: var(--bg);
    color: #1a1205;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .item.done .check {
    background: var(--accent, #f0a830);
    border-color: var(--accent, #f0a830);
  }
  .item-label {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    color: var(--text);
    font-size: 15px;
    padding: 6px 0;
  }
  .item-label:focus {
    outline: none;
  }
  .item.done .item-label {
    color: var(--text-dim);
    text-decoration: line-through;
  }
  .item-del {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    border: none;
    background: none;
    color: var(--text-dim);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    opacity: 0.6;
  }
  .item-del:hover {
    color: var(--c-danger, #e5534b);
    opacity: 1;
  }
  .add-item {
    align-self: flex-start;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    padding: 6px 0;
    cursor: pointer;
  }
  .add-item:hover {
    color: var(--c-zone2);
  }
  .add-cat {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    padding: 13px;
    cursor: pointer;
  }
  .add-cat:hover {
    border-color: var(--c-zone2);
  }
</style>
