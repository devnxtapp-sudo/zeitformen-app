<script>
  import {
    state as app,
    loadState,
    activeGoal,
    setActiveGoal,
    selectDay,
    toggleEdit,
    toggleCompletion,
    setView,
    syncNow,
  } from "./lib/store.svelte.js";
  import { weekDates, todayKey } from "./lib/dateutil.js";
  import Dashboard from "./lib/components/Dashboard.svelte";
  import WeekPlan from "./lib/components/WeekPlan.svelte";
  import DayEditor from "./lib/components/DayEditor.svelte";
  import GoalEditor from "./lib/components/GoalEditor.svelte";
  import CalendarView from "./lib/components/CalendarView.svelte";
  import StatsView from "./lib/components/StatsView.svelte";
  import BodyAnalysisView from "./lib/components/BodyAnalysisView.svelte";
  import NutritionView from "./lib/components/NutritionView.svelte";
  import RaceNutritionView from "./lib/components/RaceNutritionView.svelte";
  import PacklistView from "./lib/components/PacklistView.svelte";
  import CompletionEditor from "./lib/components/CompletionEditor.svelte";
  import GoalWizard from "./lib/components/GoalWizard.svelte";
  import ProfileMenu from "./lib/components/ProfileMenu.svelte";
  import SettingsMenu from "./lib/components/SettingsMenu.svelte";
  import AccountView from "./lib/components/AccountView.svelte";
  import GarminView from "./lib/components/GarminView.svelte";
  import PaceCalc from "./lib/components/PaceCalc.svelte";
  import IntervalTimer from "./lib/components/IntervalTimer.svelte";
  import AuthScreen from "./lib/components/AuthScreen.svelte";
  import TopSearch from "./lib/components/TopSearch.svelte";
  import { auth, checkSession } from "./lib/auth.svelte.js";

  // load local state first, then resolve session + sync. The .catch guard makes
  // sure checkSession() still runs (and the loading screen clears) even if local
  // hydration fails for any reason.
  loadState()
    .catch(() => {})
    .then(checkSession);

  let goal = $derived(activeGoal());

  const week = weekDates();
  const today = todayKey();

  // modal state
  let editingDay = $state(null);
  let editingGoal = $state(false);
  let editingLog = $state(null); // { dateStr, dayKey }
  let creatingGoal = $state(false);
  let profileOpen = $state(false);
  let settingsOpen = $state(false);
  let statsExercise = $state(null); // search-driven exercise preselect for StatsView

  // Wizard done -> jump to the week view in edit mode so the user fills the plan.
  function onWizardCreated() {
    creatingGoal = false;
    setView("week");
    if (!app.editMode) toggleEdit();
  }

  function openLog(dateStr, dayKey) {
    editingLog = { dateStr, dayKey: dayKey ?? null };
  }

  // Editing the plan happens on the week view — switch there before toggling.
  function startEdit() {
    if (app.view !== "week") setView("week");
    toggleEdit();
  }

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

{#if !app.loaded || !auth.checked}
  <div class="py-20 text-center text-ink-muted">Lädt …</div>
{:else if !auth.user}
  <AuthScreen dismissable={false} />
{:else}
  <!-- Sidebar shell: fixed desktop rail + content column. Negative margins
       cancel #app's padding so the rail can sit flush against the left edge;
       the content column re-applies the spacing it needs. -->
  <div class="flex min-h-screen">
    <!-- Desktop fixed sidebar (lg+) — always visible. -->
    <ProfileMenu
      variant="sidebar"
      {goal}
      onsync={() => syncNow()}
      syncing={app.syncing}
      synced={app.synced}
      oncreate={() => (creatingGoal = true)}
      ontoggleedit={goal ? startEdit : undefined}
      editMode={app.editMode}
      view={app.view}
      settingsActive={editingGoal}
      onhome={() => setView("dashboard")}
      onplan={goal ? () => setView("week") : undefined}
      oncalendar={goal ? () => setView("calendar") : undefined}
      onstats={goal ? () => setView("stats") : undefined}
      onsettings={goal ? () => (editingGoal = true) : undefined}
      onbody={() => setView("body")}
      onpace={() => setView("pace")}
      ontimer={() => setView("timer")}
      onnutrition={() => setView("nutrition")}
      onracenutrition={() => setView("racenutrition")}
      onpacklist={() => setView("packlist")}
      onappsettings={() => (settingsOpen = true)}
      onaccount={() => setView("account")}
    />

    <!-- Content column -->
    <div class="min-w-0 flex-1 px-4 pt-[18px] pb-16 lg:px-5">
  <header class="mb-[22px] flex flex-wrap items-center justify-between gap-3">
    <div class="flex min-w-0 flex-wrap items-center gap-2.5">
      <!-- Mobile hamburger opens the off-canvas drawer (hidden on desktop). -->
      <button
        class="hamburger-btn lg:hidden"
        class:syncing={app.syncing}
        onclick={() => (profileOpen = true)}
        aria-label="Menü öffnen"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      {#if app.goals.length}
        <select
          class="goal-select"
          value={app.activeGoalId}
          onchange={(e) => setActiveGoal(e.target.value)}
        >
          {#each app.goals as g (g.id)}
            <option value={g.id}>{g.name}</option>
          {/each}
        </select>
      {/if}
      {#if goal}<TopSearch {goal} onselect={(v, payload) => { statsExercise = payload?.exercise ?? null; setView(v); }} />{/if}
    </div>

    <div class="flex flex-none items-center gap-2.5">
      {#if goal?.targetDate && countdown !== null}
        <span
          class="inline-flex h-[34px] flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-card px-[13px] text-[13.5px] font-bold {countdown < 0 ? 'text-ink-muted' : 'text-[var(--accent)]'}"
          title={`${fmtDate(goal.targetDate)} · bis zum Ziel`}
        >
          <svg class="flex-none" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
            <line x1="5" y1="2.5" x2="5" y2="21.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <g fill="currentColor">
              <rect x="6" y="3" width="4" height="3" /><rect x="14" y="3" width="4" height="3" /><rect x="10" y="6" width="4" height="3" /><rect x="6" y="9" width="4" height="3" /><rect x="14" y="9" width="4" height="3" />
            </g>
            <rect x="6" y="3" width="12" height="9" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5" />
          </svg>
          {#if countdown > 0}
            <span class="[text-shadow:var(--glow)]">{countdown}</span>
            <span class="font-semibold text-[var(--accent)]">Tage</span>
          {:else if countdown === 0}
            <span class="[text-shadow:var(--glow)]">heute</span>
          {:else}
            <span>fertig</span>
          {/if}
        </span>
      {/if}
    </div>
  </header>

  {#if app.view === "account"}
    <AccountView onback={() => setView("dashboard")} />
  {:else if app.view === "garmin"}
    <GarminView onback={() => setView("dashboard")} />
  {:else if app.view === "pace"}
    <PaceCalc onback={() => setView("dashboard")} />
  {:else if app.view === "timer"}
    <IntervalTimer onback={() => setView("dashboard")} />
  {:else if app.view === "body"}
    <BodyAnalysisView onback={() => setView("dashboard")} />
  {:else if app.view === "nutrition"}
    <NutritionView onback={() => setView("dashboard")} />
  {:else if app.view === "racenutrition"}
    <RaceNutritionView onback={() => setView("dashboard")} />
  {:else if app.view === "packlist"}
    <PacklistView onback={() => setView("dashboard")} />
  {:else if app.view === "calendar" && goal}
    <CalendarView {goal} onopen={openLog} />
  {:else if app.view === "stats" && goal}
    <StatsView {goal} initialExercise={statsExercise} onsync={() => setView("garmin")} />
  {:else if app.view === "week" && goal}
    <WeekPlan
      {goal}
      {week}
      {today}
      editMode={app.editMode}
      selectedDay={app.selectedDay}
      onselect={selectDay}
      onedit={(k) => (editingDay = k)}
      onlog={!app.editMode ? (dateStr, dayKey) => openLog(dateStr, dayKey) : undefined}
    />

    {#if goal.footerNote}
      <p class="muted -mt-1 mb-1 text-sm">{goal.footerNote}</p>
    {/if}
  {:else if goal}
    <Dashboard
      {goal}
      ongotoplan={() => setView("week")}
      onnav={(v) => setView(v)}
    />
  {:else}
    <section class="mb-[18px]">
      <div class="mb-2.5 flex flex-wrap items-baseline justify-between gap-3">
        <span class="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">Heutiges Training</span>
      </div>
      <button
        class="flex w-full flex-col items-center gap-2 rounded-[var(--radius)] border border-dashed border-line-strong bg-card px-5 py-[34px] text-center transition-colors duration-150 hover:border-[var(--accent)] hover:bg-card-hover"
        onclick={() => (creatingGoal = true)}
      >
        <span class="mb-1 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)]" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
          </svg>
        </span>
        <span class="text-base font-bold text-ink">Neues Training anlegen</span>
      </button>
    </section>
  {/if}

  {#if editingDay && goal}
    <DayEditor {goal} dayKey={editingDay} onclose={() => (editingDay = null)} />
  {/if}
  {#if editingGoal && goal}
    <GoalEditor {goal} onclose={() => (editingGoal = false)} />
  {/if}
  {#if editingLog && goal}
    <CompletionEditor
      {goal}
      dateStr={editingLog.dateStr}
      dayKey={editingLog.dayKey}
      onclose={() => (editingLog = null)}
    />
  {/if}
  {#if creatingGoal}
    <GoalWizard
      onclose={() => (creatingGoal = false)}
      oncreated={onWizardCreated}
      dismissable={app.goals.length > 0}
    />
  {/if}
  {#if profileOpen && !settingsOpen}
    <ProfileMenu
      variant="drawer"
      {goal}
      onclose={() => (profileOpen = false)}
      onsync={() => syncNow()}
      syncing={app.syncing}
      synced={app.synced}
      oncreate={() => (creatingGoal = true)}
      ontoggleedit={goal ? startEdit : undefined}
      editMode={app.editMode}
      view={app.view}
      settingsActive={editingGoal}
      onhome={() => setView("dashboard")}
      onplan={goal ? () => setView("week") : undefined}
      oncalendar={goal ? () => setView("calendar") : undefined}
      onstats={goal ? () => setView("stats") : undefined}
      onsettings={goal ? () => (editingGoal = true) : undefined}
      onbody={() => setView("body")}
      onpace={() => setView("pace")}
      ontimer={() => setView("timer")}
      onnutrition={() => setView("nutrition")}
      onracenutrition={() => setView("racenutrition")}
      onpacklist={() => setView("packlist")}
      onappsettings={() => (settingsOpen = true)}
    />
  {/if}
  {#if settingsOpen}
    <SettingsMenu
      onback={() => (settingsOpen = false)}
      onclose={() => { settingsOpen = false; profileOpen = false; }}
      onaccount={() => setView("account")}
      ongarmin={() => setView("garmin")}
    />
  {/if}

  <footer class="mt-12 flex flex-col items-center gap-3 border-t border-line px-0 pb-4 pt-6 text-center">
    <nav class="site-footer-links flex flex-wrap items-center justify-center" aria-label="Rechtliches">
      <a href="/impressum">Impressum</a>
      <a href="/agb">AGB</a>
      <a href="/datenschutz">Datenschutz</a>
      <a href="mailto:devnxt.app@gmail.com">Kontakt</a>
    </nav>
    <span class="flex flex-col items-center gap-1 text-[13px] text-ink-dim">
      <span>© 2026 rxZone.</span>
      <span>Alle Rechte vorbehalten.</span>
      <span>Made with <span aria-label="Liebe">❤️</span> in Germany</span>
    </span>
  </footer>
    </div>
    <!-- /content column -->
  </div>
  <!-- /sidebar shell -->
{/if}

<style>
  /* Mobile hamburger: pill button that opens the off-canvas drawer. Spins while
     a sync is in flight (matches the old avatar-tap affordance). */
  .hamburger-btn {
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border);
    padding: 0;
    background: var(--card);
    color: var(--text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.15s,
      border-color 0.15s;
  }
  .hamburger-btn:hover {
    background: var(--card-hover);
    border-color: var(--border-strong);
  }
  /* desktop has the always-on sidebar rail — hide the drawer trigger */
  @media (min-width: 1024px) {
    .hamburger-btn {
      display: none;
    }
  }
  .hamburger-btn.syncing {
    animation: avatar-spin 0.9s linear infinite;
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.5);
  }
  @keyframes avatar-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  /* Goal select: pill chrome + custom SVG chevron background-image */
  :global(.goal-select) {
    width: auto;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    height: 34px;
    padding: 0 32px 0 15px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
    background-color: var(--card);
    border: 1px solid var(--border);
    border-radius: 999px;
    text-overflow: ellipsis;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239aa0a6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }
  :global(.goal-select:hover) {
    border-color: var(--border-strong);
    background-color: var(--card-hover);
  }
  :global(.goal-select:focus) {
    border-color: var(--accent);
  }
  /* Footer links: muted color + vertical separators between items */
  .site-footer-links a {
    position: relative;
    color: var(--text-muted);
    font-size: 14px;
    text-decoration: none;
    padding: 0 15px;
  }
  .site-footer-links a:not(:last-child)::after {
    content: "";
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 12px;
    background: var(--border);
  }
  .site-footer-links a:hover {
    color: var(--text);
  }
</style>
