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
  import WeekProgress from "./lib/components/WeekProgress.svelte";
  import WeekGrid from "./lib/components/WeekGrid.svelte";
  import SessionDetail from "./lib/components/SessionDetail.svelte";
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
  <div class="loading">Lädt …</div>
{:else if !auth.user}
  <AuthScreen dismissable={false} />
{:else}
  <header class="topbar">
    <div class="brand-row">
      {#if auth.user}
        <button
          class="avatar-btn"
          class:syncing={app.syncing}
          onclick={() => (profileOpen = true)}
          title={auth.user.email}
          aria-label="Profil und Menü"
        >
          {#if auth.user.picture}
            <img src={auth.user.picture} alt="" referrerpolicy="no-referrer" />
          {:else}
            {(auth.user.name?.[0] || auth.user.email[0] || "?").toUpperCase()}
          {/if}
        </button>
      {/if}
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
      {#if goal?.targetDate && countdown !== null}
        <span
          class="days-pill"
          class:past={countdown < 0}
          title={`${fmtDate(goal.targetDate)} · bis zum Ziel`}
        >
          <svg
            class="flag-icon"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <line
              x1="5"
              y1="2.5"
              x2="5"
              y2="21.5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <g fill="currentColor">
              <rect x="6" y="3" width="4" height="3" />
              <rect x="14" y="3" width="4" height="3" />
              <rect x="10" y="6" width="4" height="3" />
              <rect x="6" y="9" width="4" height="3" />
              <rect x="14" y="9" width="4" height="3" />
            </g>
            <rect
              x="6"
              y="3"
              width="12"
              height="9"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              opacity="0.5"
            />
          </svg>
          {#if countdown > 0}
            <span class="days-num">{countdown}</span>
            <span class="days-lbl">Tage</span>
          {:else if countdown === 0}
            <span class="days-num">heute</span>
          {:else}
            <span class="days-num">fertig</span>
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
    <div class="subpage-head">
      <button class="back-btn" onclick={() => setView("dashboard")} aria-label="Zurück">‹</button>
      <h2>Kalender</h2>
    </div>
    <CalendarView {goal} onopen={openLog} />
  {:else if app.view === "stats" && goal}
    <div class="subpage-head">
      <button class="back-btn" onclick={() => setView("dashboard")} aria-label="Zurück">‹</button>
      <h2>Statistik</h2>
    </div>
    <StatsView {goal} />
  {:else if app.view === "week" && goal}
    <div class="subpage-head">
      <button class="back-btn" onclick={() => { if (app.editMode) toggleEdit(); setView("dashboard"); }} aria-label="Zurück">‹</button>
      <h2>Wochenplan</h2>
    </div>

    {#if !app.editMode}
      <WeekProgress {goal} {week} />
    {/if}

    {#if !app.editMode && (goal.targetGoal || goal.category || goal.description)}
      <div class="goal-head">
        <div>
          {#if goal.targetGoal || goal.category}
            <div class="goal-pill">
              {#if goal.category}
                <span class="seg seg-cat">{goal.category}</span>
              {/if}
              {#if goal.targetGoal}
                <span class="seg seg-target">
                  <span class="tg-icon">◎</span>
                  <span class="tg-text">{goal.targetGoal}</span>
                </span>
              {/if}
            </div>
          {/if}
          {#if goal.description}
            <p class="goal-desc muted">{goal.description}</p>
          {/if}
        </div>
      </div>
    {/if}

    <WeekGrid
      {goal}
      selectedDay={app.selectedDay}
      onselect={selectDay}
      onedit={(k) => (editingDay = k)}
      editMode={app.editMode}
      {week}
      {today}
      ontoggle={(dateStr, dayKey) => toggleCompletion(goal.id, dateStr, dayKey)}
    />

    <SessionDetail
      {goal}
      dayKey={app.selectedDay}
      onedit={(k) => (editingDay = k)}
      editMode={app.editMode}
      onlog={!app.editMode ? (dateStr, dayKey) => openLog(dateStr, dayKey) : undefined}
      weekDate={week[app.selectedDay]}
    />

    {#if goal.footerNote}
      <p class="footer-note muted">{goal.footerNote}</p>
    {/if}
  {:else if goal}
    <Dashboard
      {goal}
      ongotoplan={() => setView("week")}
    />
  {:else}
    <section class="today-block">
      <div class="today-head">
        <span class="eyebrow">Heutiges Training</span>
      </div>
      <button class="empty-card" onclick={() => (creatingGoal = true)}>
        <span class="empty-plus" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
          </svg>
        </span>
        <span class="empty-title">Neues Training anlegen</span>
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
      onclose={() => (profileOpen = false)}
      onsync={() => syncNow()}
      syncing={app.syncing}
      synced={app.synced}
      oncreate={() => (creatingGoal = true)}
      ontoggleedit={goal ? startEdit : undefined}
      editMode={app.editMode}
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

  <footer class="site-footer">
    <nav class="site-footer-links" aria-label="Rechtliches">
      <a href="/impressum">Impressum</a>
      <a href="/agb">AGB</a>
      <a href="/datenschutz">Datenschutz</a>
      <a href="mailto:devnxt.app@gmail.com">Kontakt</a>
    </nav>
    <span class="site-footer-copy">
      <span>© 2026 rxZone.</span>
      <span>Alle Rechte vorbehalten.</span>
      <span>Made with <span aria-label="Liebe">❤️</span> in Germany</span>
    </span>
  </footer>
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
  .brand-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    min-width: 0;
  }
  .avatar-btn {
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    padding: 0;
    overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    color: var(--on-accent);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .avatar-btn img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .avatar-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.25);
  }
  /* spin the avatar while a sync is in flight (1× tap triggers it) */
  .avatar-btn.syncing {
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
  .goal-select {
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
  .goal-select:hover {
    border-color: var(--border-strong);
    background-color: var(--card-hover);
  }
  .goal-select:focus {
    border-color: var(--accent);
  }
  .goal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }
  .goal-pill {
    display: inline-flex;
    align-items: stretch;
    margin-top: 10px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 999px;
    overflow: hidden;
    max-width: 100%;
  }
  .seg {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    white-space: nowrap;
  }
  .seg + .seg {
    border-left: 1px solid var(--border);
  }
  .seg-cat {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--text);
  }
  .seg-target {
    font-size: 14px;
    font-weight: 700;
    color: var(--accent);
    min-width: 0;
  }
  .seg-target .tg-text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tg-icon {
    font-size: 13px;
    flex: 0 0 auto;
  }
  .days-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    box-sizing: border-box;
    height: 34px;
    padding: 0 13px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--accent);
    white-space: nowrap;
  }
  .days-pill .flag-icon {
    flex: 0 0 auto;
  }
  .days-pill .days-num {
    text-shadow: var(--glow);
  }
  .days-pill .days-lbl {
    font-weight: 600;
    color: var(--accent);
  }
  .days-pill.past {
    color: var(--text-muted);
  }
  .days-pill.past .days-num {
    text-shadow: none;
  }
  .goal-desc {
    margin-top: 10px;
    font-size: 14.5px;
    max-width: 560px;
  }
  .footer-note {
    font-size: 14px;
    margin-top: -4px;
    margin-bottom: 4px;
  }
  .today-block {
    margin-bottom: 18px;
  }
  .today-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .empty-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 34px 20px;
    background: var(--card);
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius);
    cursor: pointer;
    text-align: center;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .empty-card:hover {
    border-color: var(--accent);
    background: var(--card-hover);
  }
  .empty-plus {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    margin-bottom: 4px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
  }
  .empty-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
  }
  @media (max-width: 560px) {
    .goal-head {
      flex-direction: column;
    }
  }
  .site-footer {
    margin-top: 48px;
    padding: 24px 0 16px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }
  .site-footer-links {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }
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
  .site-footer-copy {
    color: var(--text-dim);
    font-size: 13px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
</style>
