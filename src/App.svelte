<script>
  import {
    state as app,
    loadState,
    activeGoal,
    setActiveGoal,
    selectDay,
    toggleEdit,
    addGoal,
  } from "./lib/store.svelte.js";
  import TypeLegend from "./lib/components/TypeLegend.svelte";
  import WeekGrid from "./lib/components/WeekGrid.svelte";
  import SessionDetail from "./lib/components/SessionDetail.svelte";
  import NotesSection from "./lib/components/NotesSection.svelte";
  import DayEditor from "./lib/components/DayEditor.svelte";
  import NoteEditor from "./lib/components/NoteEditor.svelte";
  import GoalEditor from "./lib/components/GoalEditor.svelte";

  loadState();

  let goal = $derived(activeGoal());

  // modal state
  let editingDay = $state(null);
  let editingNote = $state(null);
  let editingGoal = $state(false);

  function daysLeft(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / 86400000);
  }

  let countdown = $derived(goal ? daysLeft(goal.targetDate) : null);

  function fmtDate(d) {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
</script>

{#if !app.loaded}
  <div class="loading">Lädt …</div>
{:else}
  <header class="topbar">
    <div class="brand">
      <span class="logo">●</span>
      <span class="app-name">TrainingHub</span>
    </div>
    <div class="controls">
      <select
        class="goal-select"
        value={app.activeGoalId}
        onchange={(e) => setActiveGoal(e.target.value)}
      >
        {#each app.goals as g (g.id)}
          <option value={g.id}>{g.name}</option>
        {/each}
      </select>
      <button class="btn btn-sm" onclick={() => addGoal()}>+ Ziel</button>
      <button
        class="btn btn-sm"
        class:btn-primary={app.editMode}
        onclick={toggleEdit}
      >
        {app.editMode ? "Fertig" : "✎ Bearbeiten"}
      </button>
    </div>
  </header>

  {#if goal}
    <div class="goal-head">
      <div>
        <h1>{goal.name}</h1>
        {#if goal.description}
          <p class="goal-desc muted">{goal.description}</p>
        {/if}
      </div>
      {#if goal.targetDate}
        <div class="countdown" class:past={countdown < 0}>
          {#if countdown > 0}
            <span class="big">{countdown}</span>
            <span class="lbl">Tage bis zum Ziel</span>
          {:else if countdown === 0}
            <span class="big">heute</span>
            <span class="lbl">Wettkampftag</span>
          {:else}
            <span class="lbl">abgeschlossen</span>
          {/if}
          <span class="date">{fmtDate(goal.targetDate)}</span>
        </div>
      {/if}
    </div>

    {#if app.editMode}
      <button class="btn btn-sm edit-goal" onclick={() => (editingGoal = true)}>
        ⚙ Ziel-Einstellungen
      </button>
    {/if}

    <TypeLegend types={goal.types} />

    <WeekGrid
      {goal}
      selectedDay={app.selectedDay}
      onselect={selectDay}
      onedit={(k) => (editingDay = k)}
      editMode={app.editMode}
    />

    <SessionDetail
      {goal}
      dayKey={app.selectedDay}
      onedit={(k) => (editingDay = k)}
      editMode={app.editMode}
    />

    {#if goal.footerNote}
      <p class="footer-note muted">{goal.footerNote}</p>
    {/if}

    <NotesSection
      {goal}
      editMode={app.editMode}
      oneditnote={(id) => (editingNote = id)}
    />
  {:else}
    <div class="empty-state">
      <p>Noch kein Trainingsziel.</p>
      <button class="btn btn-primary" onclick={() => addGoal()}>
        + Trainingsziel anlegen
      </button>
    </div>
  {/if}

  {#if editingDay && goal}
    <DayEditor {goal} dayKey={editingDay} onclose={() => (editingDay = null)} />
  {/if}
  {#if editingNote && goal}
    <NoteEditor {goal} noteId={editingNote} onclose={() => (editingNote = null)} />
  {/if}
  {#if editingGoal && goal}
    <GoalEditor {goal} onclose={() => (editingGoal = false)} />
  {/if}
{/if}

<style>
  .loading {
    text-align: center;
    padding: 80px 0;
    color: var(--text-muted);
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .logo {
    color: var(--accent);
    font-size: 14px;
  }
  .app-name {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: -0.01em;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .goal-select {
    width: auto;
    min-width: 140px;
    padding: 7px 10px;
    font-size: 13.5px;
  }
  .goal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }
  .goal-head h1 {
    font-size: 28px;
    letter-spacing: -0.02em;
  }
  .goal-desc {
    margin-top: 6px;
    font-size: 14.5px;
    max-width: 560px;
  }
  .countdown {
    flex: 0 0 auto;
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 16px;
  }
  .countdown .big {
    font-size: 26px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }
  .countdown.past .big {
    color: var(--text-muted);
  }
  .countdown .lbl {
    font-size: 11.5px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 4px;
  }
  .countdown .date {
    font-size: 12px;
    color: var(--text-dim);
    margin-top: 6px;
  }
  .edit-goal {
    margin-bottom: 16px;
  }
  .footer-note {
    font-size: 14px;
    margin-top: -4px;
    margin-bottom: 4px;
  }
  .empty-state {
    text-align: center;
    padding: 60px 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    color: var(--text-muted);
  }
  @media (max-width: 560px) {
    .goal-head {
      flex-direction: column;
    }
    .countdown {
      align-self: flex-start;
      text-align: left;
      align-items: flex-start;
    }
  }
</style>
