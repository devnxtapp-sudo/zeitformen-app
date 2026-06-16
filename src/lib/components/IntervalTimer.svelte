<script>
  import { onMount, onDestroy } from "svelte";

  let { onback } = $props();

  // ---- Persistenz-Schlüssel -------------------------------------------------
  const CFG_KEY = "rxzone.timer.cfg";
  const LAST_KEY = "rxzone.timer.last";
  const HIST_KEY = "rxzone.timer.history";
  const PREFS_KEY = "rxzone.timer.prefs";

  // ---- Konfiguration (persistiert) -----------------------------------------
  const DEFAULT = {
    prepare: 10, // Vorbereitung (s)
    work: 120, // Arbeit (s)
    rest: 0, // Pause zwischen Übungen (s)
    exercises: 3, // Übungen pro Runde
    rounds: 3, // Runden
    roundRest: 120, // Rundenpause (s)
  };
  function loadCfg() {
    try {
      const s = JSON.parse(localStorage.getItem(CFG_KEY) || "null");
      if (s) return { ...DEFAULT, ...s };
    } catch {}
    return { ...DEFAULT };
  }
  let cfg = $state(loadCfg());
  $effect(() => localStorage.setItem(CFG_KEY, JSON.stringify(cfg)));

  // ---- Einstellungen (persistiert) -----------------------------------------
  const DEFAULT_PREFS = {
    soundMode: "signal", // signal | de | en | mute
    volume: 100,
    vibrate: false,
    pauseOnBlur: true,
  };
  function loadPrefs() {
    try {
      const s = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
      if (s) return { ...DEFAULT_PREFS, ...s };
    } catch {}
    return { ...DEFAULT_PREFS };
  }
  let prefs = $state(loadPrefs());
  $effect(() => localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)));

  let hasLast = $state(!!localStorage.getItem(LAST_KEY));
  function loadPrevious() {
    try {
      const l = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
      if (l) cfg = { ...DEFAULT, ...l };
    } catch {}
  }

  // Stepper-Grenzen je Feld.
  const STEP = {
    prepare: { s: 5, min: 0, max: 60 },
    work: { s: 5, min: 5, max: 3600 },
    rest: { s: 5, min: 0, max: 1800 },
    exercises: { s: 1, min: 1, max: 30 },
    rounds: { s: 1, min: 1, max: 30 },
    roundRest: { s: 5, min: 0, max: 1800 },
  };
  function bump(key, dir) {
    const m = STEP[key];
    cfg[key] = Math.min(m.max, Math.max(m.min, cfg[key] + dir * m.s));
  }

  // ---- Navigation -----------------------------------------------------------
  let tab = $state("timer"); // timer | history | stats | settings

  // ---- Ablaufplan -----------------------------------------------------------
  function buildSegments(withPrepare, c = cfg) {
    const segs = [];
    if (withPrepare && c.prepare > 0)
      segs.push({ phase: "prepare", dur: c.prepare });
    for (let r = 0; r < c.rounds; r++) {
      for (let e = 0; e < c.exercises; e++) {
        segs.push({ phase: "work", dur: c.work, e, round: r + 1 });
        const lastEx = e === c.exercises - 1;
        if (c.rest > 0 && !lastEx)
          segs.push({ phase: "rest", dur: c.rest, e, round: r + 1 });
      }
      if (c.roundRest > 0 && r < c.rounds - 1)
        segs.push({ phase: "roundrest", dur: c.roundRest, round: r + 1 });
    }
    return segs;
  }
  function plannedSec(c) {
    return buildSegments(false, c).reduce((a, s) => a + s.dur, 0);
  }
  let totalSec = $derived(plannedSec(cfg));

  // ---- Laufzeit-Status ------------------------------------------------------
  let running = $state(false);
  let finished = $state(false);
  let paused = $state(false);
  let segments = $state([]);
  let segIndex = $state(0);
  let remainingMs = $state(0);

  let cur = $derived(segments[segIndex] ?? null);
  let curDur = $derived(cur ? cur.dur : 1);
  let segRemaining = $derived(Math.max(0, Math.ceil(remainingMs / 1000)));
  let ringFrac = $derived(
    cur ? Math.min(1, Math.max(0, remainingMs / (curDur * 1000))) : 0,
  );

  const PHASE_TITLE = {
    prepare: "Machen Sie sich bereit",
    work: "Arbeit",
    rest: "Pause",
    roundrest: "Rundenpause",
  };

  let curRound = $derived(cur?.round ?? 1);
  let curExercise = $derived(cur && cur.e != null ? cur.e + 1 : 1);

  function nextWorkLabel() {
    for (let i = segIndex + 1; i < segments.length; i++)
      if (segments[i].phase === "work") return `Übung ${segments[i].e + 1}`;
    return "Ende";
  }

  let totalRemainingMs = $derived.by(() => {
    if (!running) return totalSec * 1000;
    let ms = cur && cur.phase !== "prepare" ? remainingMs : 0;
    for (let i = segIndex + 1; i < segments.length; i++)
      if (segments[i].phase !== "prepare") ms += segments[i].dur * 1000;
    return ms;
  });

  function fmt(sec) {
    const t = Math.max(0, Math.round(sec));
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // ---- Audio / Sprache / Vibration -----------------------------------------
  let audioCtx = null;
  function beep(freq = 880, dur = 0.12) {
    if (prefs.soundMode === "mute") return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(audioCtx.destination);
      const t = audioCtx.currentTime;
      const peak = 0.3 * (prefs.volume / 100);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur);
    } catch {}
  }
  function say(de, en) {
    const lang = prefs.soundMode === "en" ? "en-US" : "de-DE";
    const text = prefs.soundMode === "en" ? en : de;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.volume = prefs.volume / 100;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {}
  }
  function buzz(ms = 120) {
    if (prefs.vibrate && navigator.vibrate) navigator.vibrate(ms);
  }
  // Phasenwechsel ankündigen — je nach Audio-Modus Ton oder Sprache.
  function announce(seg) {
    buzz(150);
    if (prefs.soundMode === "signal") {
      beep(1320, 0.18);
      return;
    }
    if (prefs.soundMode === "mute") return;
    const labels = {
      prepare: ["Machen Sie sich bereit", "Get ready"],
      work: [`Übung ${(seg.e ?? 0) + 1}`, `Exercise ${(seg.e ?? 0) + 1}`],
      rest: ["Pause", "Rest"],
      roundrest: ["Rundenpause", "Round rest"],
    };
    const [de, en] = labels[seg.phase] ?? ["", ""];
    say(de, en);
  }

  // ---- Tick-Schleife --------------------------------------------------------
  let lastTs = 0;
  let interval = null;
  function tick() {
    const now = Date.now();
    if (!running || paused || finished) {
      lastTs = now;
      return;
    }
    const dt = now - lastTs;
    lastTs = now;
    const before = Math.ceil(remainingMs / 1000);
    remainingMs = Math.max(0, remainingMs - dt);
    const after = Math.ceil(remainingMs / 1000);
    if (after !== before && after > 0 && after <= 3) {
      if (prefs.soundMode !== "mute") beep(880, 0.1);
      buzz(60);
    }
    if (remainingMs <= 0) advance();
  }

  function start() {
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.resume?.();
    } catch {}
    segments = buildSegments(true);
    if (!segments.length) return;
    segIndex = 0;
    remainingMs = segments[0].dur * 1000;
    running = true;
    finished = false;
    paused = false;
    lastTs = Date.now();
    localStorage.setItem(LAST_KEY, JSON.stringify(cfg));
    hasLast = true;
    announce(segments[0]);
    if (!interval) interval = setInterval(tick, 100);
  }

  function advance() {
    if (segIndex + 1 >= segments.length) {
      complete();
      return;
    }
    segIndex++;
    remainingMs = segments[segIndex].dur * 1000;
    lastTs = Date.now();
    announce(segments[segIndex]);
  }

  function togglePause() {
    paused = !paused;
    lastTs = Date.now();
  }
  function skip() {
    advance();
  }
  function exitRun() {
    running = false;
    finished = false;
    paused = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  // ---- Verlauf + Abschluss --------------------------------------------------
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
    } catch {
      return [];
    }
  }
  let history = $state(loadHistory());
  function saveHistory() {
    localStorage.setItem(HIST_KEY, JSON.stringify(history));
  }

  let workoutName = $state("");

  function complete() {
    running = false;
    finished = true;
    paused = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    buzz(300);
    if (prefs.soundMode !== "mute") {
      beep(1320, 0.16);
      setTimeout(() => beep(1660, 0.16), 180);
      setTimeout(() => beep(1980, 0.28), 360);
    }
    if (prefs.soundMode === "de" || prefs.soundMode === "en")
      say("Geschafft", "Complete");
    history = [
      {
        ts: Date.now(),
        sec: totalSec,
        name: "",
        cfg: {
          work: cfg.work,
          rest: cfg.rest,
          exercises: cfg.exercises,
          rounds: cfg.rounds,
        },
      },
      ...history,
    ].slice(0, 100);
    saveHistory();
    workoutName = "";
  }

  function finishDone() {
    if (workoutName.trim() && history[0]) {
      history[0].name = workoutName.trim();
      saveHistory();
    }
    finished = false;
  }

  // Streak: aufeinanderfolgende Kalendertage mit mind. einem Workout.
  let streak = $derived.by(() => {
    const days = new Set(history.map((h) => new Date(h.ts).toDateString()));
    let n = 0;
    const d = new Date();
    while (days.has(d.toDateString())) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  });

  function dayLabel(ts) {
    const d = new Date(ts);
    if (d.toDateString() === new Date().toDateString()) return "Heute";
    return d.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ---- Verlauf-Aktionen -----------------------------------------------------
  let optionsTs = $state(null); // welches Item zeigt das Optionen-Menü
  let renameTs = $state(null);
  let renameVal = $state("");

  function useSettings(h) {
    cfg = { ...cfg, ...h.cfg };
    optionsTs = null;
    tab = "timer";
  }
  function startRename(h) {
    renameTs = h.ts;
    renameVal = h.name || "";
    optionsTs = null;
  }
  function commitRename() {
    const h = history.find((x) => x.ts === renameTs);
    if (h) {
      h.name = renameVal.trim();
      saveHistory();
    }
    renameTs = null;
  }
  function deleteWorkout(h) {
    history = history.filter((x) => x.ts !== h.ts);
    saveHistory();
    optionsTs = null;
  }
  function exportHistory() {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "intervall-verlauf.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Statistik mit Zeitraum ----------------------------------------------
  let range = $state("all"); // all | week | month
  let rangeHistory = $derived.by(() => {
    if (range === "all") return history;
    const now = Date.now();
    const span = range === "week" ? 7 : 30;
    const cutoff = now - span * 86400000;
    return history.filter((h) => h.ts >= cutoff);
  });
  let rangeTotalSec = $derived(rangeHistory.reduce((a, h) => a + h.sec, 0));

  // ---- App-Verlassen → unterbrechen ----------------------------------------
  function onVisibility() {
    if (prefs.pauseOnBlur && document.hidden && running && !paused)
      togglePause();
  }
  onMount(() => document.addEventListener("visibilitychange", onVisibility));
  onDestroy(() => {
    document.removeEventListener("visibilitychange", onVisibility);
    if (interval) clearInterval(interval);
  });

  const RING_C = 2 * Math.PI * 110;

  let rows = $derived([
    { key: "prepare", label: "Vorbereitung", color: "var(--c-kraft)", time: true },
    { key: "work", label: "Arbeit", color: "var(--c-zone2)", time: true },
    { key: "rest", label: "Pause", color: "var(--c-danger, #e5534b)", time: true },
    { key: "exercises", label: "Übungen", color: "var(--text-muted)", time: false },
    { key: "rounds", label: "Runden", color: "var(--accent)", time: false, suffix: "×" },
    { key: "roundRest", label: "Rundenpause", color: "#eab308", time: true },
  ]);

  const TABS = [
    { id: "timer", label: "Timer" },
    { id: "history", label: "Verlauf" },
    { id: "stats", label: "Statistik" },
    { id: "settings", label: "Einstellungen" },
  ];
  const PREP_PRESETS = [0, 10, 30, 60];
  const SOUND_MODES = [
    { id: "signal", label: "Signaltöne" },
    { id: "de", label: "Stimme DE" },
    { id: "en", label: "Stimme EN" },
    { id: "mute", label: "Stumm" },
  ];
  const RANGES = [
    { id: "all", label: "Bis heute" },
    { id: "week", label: "Letzte Woche" },
    { id: "month", label: "Letzter Monat" },
  ];
</script>

{#if running}
  <!-- ============ Laufender Timer ============ -->
  <div class="run" data-phase={cur?.phase}>
    <button class="run-close" onclick={exitRun} aria-label="Beenden">✕</button>
    <h2 class="run-title">{PHASE_TITLE[cur?.phase] ?? ""}</h2>

    {#if cur?.phase === "prepare"}
      <label class="blur-toggle">
        <span>Training unterbrechen, wenn ich die App verlasse</span>
        <input type="checkbox" bind:checked={prefs.pauseOnBlur} />
        <span class="switch" aria-hidden="true"></span>
      </label>
    {:else}
      <div class="pills">
        <div class="pill">
          <span>Übung</span>
          <span class="dots">
            {#each Array(cfg.exercises) as _, i (i)}
              <span class="d" class:on={i + 1 === curExercise}></span>
            {/each}
          </span>
        </div>
        <div class="pill">
          <span>Runde</span>
          <span class="dots">
            {#each Array(cfg.rounds) as _, i (i)}
              <span class="d" class:on={i + 1 === curRound}></span>
            {/each}
          </span>
        </div>
      </div>
    {/if}

    <div class="ring-wrap">
      <svg class="ring" viewBox="0 0 240 240" aria-hidden="true">
        <circle class="ring-bg" cx="120" cy="120" r="110" />
        <circle
          class="ring-fg"
          cx="120"
          cy="120"
          r="110"
          style="stroke-dasharray:{RING_C};stroke-dashoffset:{RING_C * ringFrac}"
        />
      </svg>
      <div class="ring-center">
        <span class="ring-phase">{(PHASE_TITLE[cur?.phase] ?? "").toUpperCase()}</span>
        <span class="ring-time">{fmt(segRemaining)}</span>
        {#if cur?.phase !== "prepare"}
          <span class="ring-total">
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            {fmt(totalRemainingMs / 1000)}
          </span>
        {/if}
      </div>
    </div>

    <div class="upnext">
      {#if cur?.phase === "work"}
        <span class="up-big">ÜBUNG {curExercise}</span>
      {:else}
        <span class="up-small">Als nächstes</span>
        <span class="up-big">{nextWorkLabel().toUpperCase()}</span>
      {/if}
    </div>

    <div class="controls">
      <button
        class="ctl"
        onclick={() => (prefs.soundMode = prefs.soundMode === "mute" ? "signal" : "mute")}
        aria-label="Ton"
      >
        {#if prefs.soundMode === "mute"}
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>
            <path d="M17 9l4 6M21 9l-4 6" stroke="currentColor" stroke-width="2"/>
          </svg>
        {:else}
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>
            <path d="M16 8a5 5 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        {/if}
      </button>
      <button class="ctl ctl-main" onclick={togglePause} aria-label={paused ? "Fortsetzen" : "Pause"}>
        {#if paused}
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
            <polygon points="7,5 20,12 7,19" fill="currentColor"/>
          </svg>
        {:else}
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" fill="currentColor"/>
            <rect x="14" y="5" width="4" height="14" fill="currentColor"/>
          </svg>
        {/if}
      </button>
      <button class="ctl" onclick={skip} aria-label="Überspringen">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="5,5 15,12 5,19" fill="currentColor"/>
          <rect x="16" y="5" width="3" height="14" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </div>
{:else if finished}
  <!-- ============ Abschluss ============ -->
  <div class="done">
    <div class="done-check">
      <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h2 class="done-title">Herzlichen Glückwunsch!</h2>
    <p class="done-sub">Vollständig</p>

    <label class="name-field">
      <span>Workout benennen (optional)</span>
      <input type="text" bind:value={workoutName} placeholder="z.B. EMOM Beine" maxlength="40" />
    </label>

    <div class="stats">
      <div class="stat">
        <span class="stat-num" style="color:var(--c-zone2)">{streak}</span>
        <span class="stat-lbl">Tage in Folge</span>
      </div>
      <div class="stat">
        <span class="stat-num" style="color:var(--accent)">{history.length}</span>
        <span class="stat-lbl">Trainings gesamt</span>
      </div>
      <div class="stat">
        <span class="stat-num" style="color:var(--accent)">{fmt(history[0]?.sec ?? totalSec)}</span>
        <span class="stat-lbl">Trainingszeit</span>
      </div>
    </div>

    <div class="done-actions">
      <button class="btn btn-ghost" onclick={() => { finished = false; tab = "history"; }}>Verlauf anzeigen</button>
      <button class="btn btn-primary" onclick={finishDone}>Fertig</button>
    </div>
  </div>
{:else}
  <!-- ============ Konfig / Verlauf / Statistik / Einstellungen ============ -->
  <div class="subpage-head">
    <button class="back-btn" onclick={() => onback?.()} aria-label="Zurück">‹</button>
    <h2>Intervall-Timer</h2>
  </div>

  <div class="tabs">
    {#each TABS as t (t.id)}
      <button class="tab" class:active={tab === t.id} onclick={() => (tab = t.id)}>{t.label}</button>
    {/each}
  </div>

  {#if tab === "timer"}
    <div class="total">
      <span class="total-num">{fmt(totalSec)}</span>
      <span class="total-lbl">Gesamtzeit</span>
    </div>
    <button class="play-btn" onclick={start} aria-label="Intervall starten">
      <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
        <polygon points="7,5 20,12 7,19" fill="currentColor" />
      </svg>
    </button>
    <div class="rows">
      <button class="row load" onclick={loadPrevious} disabled={!hasLast}>
        <svg class="row-ic" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
        <span class="row-lbl">Vorheriges Workout laden</span>
        <span class="chev" aria-hidden="true">»</span>
      </button>
      {#each rows as r (r.key)}
        <div class="row" style="--rc:{r.color}">
          <span class="row-dot" aria-hidden="true"></span>
          <span class="row-lbl">{r.label}</span>
          <div class="stepper">
            <button onclick={() => bump(r.key, -1)} aria-label="weniger">−</button>
            <span class="row-val">{r.time ? fmt(cfg[r.key]) : cfg[r.key] + (r.suffix ?? "")}</span>
            <button onclick={() => bump(r.key, 1)} aria-label="mehr">+</button>
          </div>
        </div>
      {/each}
    </div>
  {:else if tab === "history"}
    <div class="hist-head">
      <span class="hist-count">{history.length} {history.length === 1 ? "Workout" : "Workouts"}</span>
      {#if history.length}
        <button class="hist-export" onclick={exportHistory} aria-label="Verlauf exportieren">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v12M8 11l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      {/if}
    </div>
    {#if !history.length}
      <p class="empty">Noch keine abgeschlossenen Workouts.</p>
    {/if}
    {#each history as h (h.ts)}
      <div class="hcard">
        <div class="hcard-top">
          <svg class="cal" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <span class="hcard-date">{dayLabel(h.ts)}</span>
          <span class="hcard-dur">{fmt(h.sec)} min</span>
          <button class="hcard-opt" onclick={() => (optionsTs = optionsTs === h.ts ? null : h.ts)} aria-label="Optionen">⋯</button>
        </div>
        {#if h.name}<div class="hcard-name">{h.name}</div>{/if}
        <div class="hcard-grid">
          <div><span class="hg-lbl">Arbeit</span><span class="hg-val">{h.cfg?.work ?? "–"}<small>s</small></span></div>
          <div><span class="hg-lbl">Pause</span><span class="hg-val">{h.cfg?.rest ?? "–"}<small>s</small></span></div>
          <div><span class="hg-lbl">Übungen</span><span class="hg-val">{h.cfg?.exercises ?? "–"}</span></div>
          <div><span class="hg-lbl">Runden</span><span class="hg-val">{h.cfg?.rounds ?? "–"}</span></div>
        </div>

        {#if renameTs === h.ts}
          <div class="rename">
            <input type="text" bind:value={renameVal} placeholder="Name" maxlength="40" />
            <button class="btn btn-primary btn-sm" onclick={commitRename}>OK</button>
          </div>
        {/if}

        {#if optionsTs === h.ts}
          <div class="opt-menu">
            <span class="opt-title">Optionen</span>
            <button class="opt" onclick={() => useSettings(h)}>Diese Einstellungen verwenden</button>
            <button class="opt" onclick={() => startRename(h)}>Workout umbenennen</button>
            <button class="opt danger" onclick={() => deleteWorkout(h)}>Workout löschen</button>
          </div>
        {/if}
      </div>
    {/each}
  {:else if tab === "stats"}
    <div class="seg">
      {#each RANGES as r (r.id)}
        <button class="seg-btn" class:active={range === r.id} onclick={() => (range = r.id)}>{r.label}</button>
      {/each}
    </div>
    <div class="stats stats-page">
      <div class="stat">
        <span class="stat-num" style="color:var(--c-zone2)">{streak}</span>
        <span class="stat-lbl">Tage in Folge</span>
      </div>
      <div class="stat">
        <span class="stat-num" style="color:var(--accent)">{rangeHistory.length}</span>
        <span class="stat-lbl">Abgeschlossene Trainings</span>
      </div>
      <div class="stat">
        <span class="stat-num" style="color:var(--accent)">{fmt(rangeTotalSec)}</span>
        <span class="stat-lbl">Zeit des Trainings</span>
      </div>
    </div>
  {:else if tab === "settings"}
    <div class="set-group">
      <span class="set-label">Vorbereitung</span>
      <div class="seg">
        {#each PREP_PRESETS as p (p)}
          <button class="seg-btn" class:active={cfg.prepare === p} onclick={() => (cfg.prepare = p)}>{p}s</button>
        {/each}
      </div>
    </div>

    <div class="set-group">
      <span class="set-label">Audio-Anleitung</span>
      <div class="seg seg-4">
        {#each SOUND_MODES as m (m.id)}
          <button class="seg-btn" class:active={prefs.soundMode === m.id} onclick={() => (prefs.soundMode = m.id)}>{m.label}</button>
        {/each}
      </div>
    </div>

    <div class="set-group">
      <div class="set-row-label">
        <span class="set-label">Lautstärke</span>
        <span class="set-val">{prefs.volume}%</span>
      </div>
      <input class="vol" type="range" min="0" max="100" step="5" bind:value={prefs.volume} />
    </div>

    <label class="set-toggle">
      <span>Training unterbrechen, wenn ich die App verlasse</span>
      <input type="checkbox" bind:checked={prefs.pauseOnBlur} />
      <span class="switch" aria-hidden="true"></span>
    </label>
    <label class="set-toggle">
      <span>Vibration bei Phasenwechsel</span>
      <input type="checkbox" bind:checked={prefs.vibrate} />
      <span class="switch" aria-hidden="true"></span>
    </label>
  {/if}
{/if}

<style>
  /* ---- Tabs ---- */
  .tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 18px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    flex: 1 1 auto;
    white-space: nowrap;
    padding: 9px 12px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text-muted);
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s, background 0.12s;
  }
  .tab.active {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
  }

  /* ---- Konfiguration ---- */
  .total {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin: 14px 0 18px;
  }
  .total-num {
    font-size: 64px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--accent);
    text-shadow: var(--glow);
    font-variant-numeric: tabular-nums;
  }
  .total-lbl {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }
  .play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    margin: 0 auto 24px;
    border-radius: 50%;
    border: none;
    background: var(--accent);
    color: var(--on-accent);
    cursor: pointer;
    box-shadow: var(--glow);
    transition: filter 0.15s, transform 0.1s;
  }
  .play-btn svg { margin-left: 4px; }
  .play-btn:hover { filter: brightness(1.08); }
  .play-btn:active { transform: scale(0.96); }
  .rows { display: flex; flex-direction: column; gap: 10px; }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 16px 18px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 16px;
    text-align: left;
  }
  .row-dot {
    flex: 0 0 auto;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--rc);
    box-shadow: 0 0 8px var(--rc);
  }
  .row-lbl { flex: 1 1 auto; font-weight: 600; }
  .row.load { cursor: pointer; color: var(--text-muted); transition: border-color 0.12s, color 0.12s; }
  .row.load:hover:not(:disabled) { border-color: var(--accent); color: var(--text); }
  .row.load:disabled { opacity: 0.45; }
  .row.load .row-ic { color: var(--accent); }
  .row.load .chev { color: var(--text-dim); font-size: 18px; }
  .stepper { display: flex; align-items: center; gap: 12px; }
  .stepper button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid var(--border-strong);
    background: var(--bg-elev);
    color: var(--text);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s;
  }
  .stepper button:hover { border-color: var(--rc); color: var(--rc); }
  .row-val {
    min-width: 58px;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    color: var(--rc);
    font-variant-numeric: tabular-nums;
  }

  /* ---- Laufender Timer ---- */
  .run {
    --phase: var(--accent);
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: max(28px, env(safe-area-inset-top)) 22px 36px;
    background:
      radial-gradient(circle at 50% 32%, color-mix(in srgb, var(--phase) 22%, transparent), transparent 62%),
      var(--bg);
    overflow-y: auto;
  }
  .run[data-phase="prepare"] { --phase: var(--c-kraft); }
  .run[data-phase="work"] { --phase: var(--c-zone2); }
  .run[data-phase="rest"] { --phase: var(--c-danger, #e5534b); }
  .run[data-phase="roundrest"] { --phase: #eab308; }
  .run-close {
    position: absolute;
    top: max(20px, env(safe-area-inset-top));
    left: 18px;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    background: var(--card);
    color: var(--text-muted);
    font-size: 17px;
    cursor: pointer;
  }
  .run-title { font-size: 21px; font-weight: 700; margin: 4px 0 18px; color: var(--phase); }
  .blur-toggle {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    max-width: 420px;
    padding: 14px 16px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 14.5px;
    font-weight: 500;
    line-height: 1.35;
  }
  .blur-toggle input, .set-toggle input { position: absolute; opacity: 0; pointer-events: none; }
  .blur-toggle .switch, .set-toggle .switch {
    flex: 0 0 auto;
    width: 46px;
    height: 28px;
    margin-left: auto;
    border-radius: 999px;
    background: var(--border-strong);
    position: relative;
    transition: background 0.18s;
  }
  .blur-toggle .switch::after, .set-toggle .switch::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.18s;
  }
  .blur-toggle input:checked + .switch { background: var(--phase); }
  .set-toggle input:checked + .switch { background: var(--accent); }
  .blur-toggle input:checked + .switch::after,
  .set-toggle input:checked + .switch::after { transform: translateX(18px); }
  .pills { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 420px; }
  .pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 16px;
    font-weight: 600;
  }
  .dots { display: inline-flex; gap: 8px; }
  .dots .d {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--border-strong);
    transition: background 0.15s, box-shadow 0.15s;
  }
  .dots .d.on { background: var(--phase); box-shadow: 0 0 8px var(--phase); }
  .ring-wrap { position: relative; width: min(78vw, 320px); aspect-ratio: 1; margin: 26px 0 8px; }
  .ring { width: 100%; height: 100%; transform: rotate(-90deg); }
  .ring-bg { fill: none; stroke: color-mix(in srgb, var(--phase) 26%, transparent); stroke-width: 6; }
  .ring-fg {
    fill: none;
    stroke: var(--phase);
    stroke-width: 8;
    stroke-linecap: round;
    filter: drop-shadow(0 0 6px var(--phase));
    transition: stroke-dashoffset 0.18s linear;
  }
  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .ring-phase { font-size: 14px; font-weight: 700; letter-spacing: 0.1em; color: var(--text-muted); }
  .ring-time {
    font-size: 64px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--phase);
    text-shadow: 0 0 20px color-mix(in srgb, var(--phase) 50%, transparent);
    font-variant-numeric: tabular-nums;
  }
  .ring-total {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 19px;
    font-weight: 700;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .upnext {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin: 18px 0 auto;
    min-height: 52px;
  }
  .up-small { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim); }
  .up-big { font-size: 30px; font-weight: 800; letter-spacing: 0.01em; color: var(--text); }
  .controls { display: flex; align-items: center; justify-content: center; gap: 28px; margin-top: 22px; }
  .ctl {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    border: none;
    background: var(--card);
    color: var(--text);
    cursor: pointer;
    transition: transform 0.1s, filter 0.15s;
  }
  .ctl:active { transform: scale(0.94); }
  .ctl-main {
    width: 84px;
    height: 84px;
    background: var(--phase);
    color: var(--on-accent);
    box-shadow: 0 0 22px color-mix(in srgb, var(--phase) 50%, transparent);
  }

  /* ---- Abschluss ---- */
  .done { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 28px 8px 12px; }
  .done-check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: rgba(var(--accent-rgb), 0.12);
    color: var(--accent);
    box-shadow: var(--glow);
    margin-bottom: 20px;
  }
  .done-title { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
  .done-sub { font-size: 15px; font-weight: 600; color: var(--accent); margin: 0 0 22px; }
  .name-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    max-width: 420px;
    margin-bottom: 22px;
    text-align: left;
  }
  .name-field span { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
  .name-field input { padding: 12px 14px; font-size: 15px; }
  .stats { display: flex; justify-content: center; gap: 14px; width: 100%; max-width: 420px; margin-bottom: 24px; }
  .stats-page { margin: 8px auto 0; }
  .stat {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 18px 8px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .stat-num { font-size: 28px; font-weight: 800; line-height: 1; text-shadow: var(--glow); font-variant-numeric: tabular-nums; }
  .stat-lbl { font-size: 11.5px; font-weight: 600; color: var(--text-muted); line-height: 1.3; }
  .done-actions { display: flex; gap: 12px; width: 100%; max-width: 420px; }
  .done-actions .btn { flex: 1 1 0; padding: 14px; font-size: 15px; font-weight: 700; }

  /* ---- Verlauf ---- */
  .hist-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .hist-count { font-size: 13px; font-weight: 600; color: var(--text-muted); }
  .hist-export {
    display: flex;
    width: 38px;
    height: 38px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--accent);
    cursor: pointer;
  }
  .empty { color: var(--text-muted); font-size: 14px; text-align: center; padding: 24px 0; }
  .hcard {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    margin-bottom: 12px;
  }
  .hcard-top { display: flex; align-items: center; gap: 10px; }
  .cal { color: var(--text-muted); flex: 0 0 auto; }
  .hcard-date { font-size: 16px; font-weight: 700; }
  .hcard-dur { margin-left: auto; font-size: 15px; font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
  .hcard-opt {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
    border-radius: 8px;
  }
  .hcard-opt:hover { background: var(--bg-elev); }
  .hcard-name { font-size: 13.5px; color: var(--text-muted); margin-top: 4px; }
  .hcard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  .hcard-grid > div { display: flex; flex-direction: column; gap: 3px; }
  .hg-lbl { font-size: 11.5px; color: var(--text-muted); }
  .hg-val { font-size: 19px; font-weight: 700; color: var(--accent); }
  .hg-val small { font-size: 11px; color: var(--text-muted); font-weight: 600; margin-left: 1px; }
  .rename { display: flex; gap: 8px; margin-top: 12px; }
  .rename input { flex: 1 1 auto; padding: 9px 11px; font-size: 14px; }
  .btn-sm { padding: 9px 14px; font-size: 14px; font-weight: 700; }
  .opt-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  .opt-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); text-align: center; }
  .opt {
    padding: 13px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.12s;
  }
  .opt:hover { border-color: var(--accent); }
  .opt.danger { color: var(--c-danger, #e5534b); }
  .opt.danger:hover { border-color: var(--c-danger, #e5534b); }

  /* ---- Statistik / Einstellungen ---- */
  .seg {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 999px;
    margin-bottom: 18px;
  }
  .seg-btn {
    flex: 1 1 0;
    padding: 10px 8px;
    border: none;
    background: none;
    border-radius: 999px;
    color: var(--text-muted);
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s;
  }
  .seg-btn.active { background: var(--accent); color: var(--on-accent); }
  .seg-4 .seg-btn { font-size: 12.5px; padding: 10px 4px; }
  .set-group { margin-bottom: 20px; }
  .set-label { font-size: 13px; font-weight: 700; color: var(--text-muted); }
  .set-group .set-label { display: block; margin-bottom: 10px; }
  .set-row-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .set-val { font-size: 14px; font-weight: 700; color: var(--accent); }
  .vol { width: 100%; accent-color: var(--accent); }
  .set-toggle {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 16px 18px;
    margin-bottom: 10px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 15px;
    font-weight: 600;
    line-height: 1.35;
  }
</style>
