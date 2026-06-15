<script>
  import { api } from "../api.js";
  import { activeGoal, updateLogEntry, isCompleted } from "../store.svelte.js";
  import { weekDates, dayKeyOf } from "../dateutil.js";

  let { onback } = $props();

  let goal = $derived(activeGoal());

  let status = $state({ connected: false, athleteId: "" });
  let loading = $state(true);
  let athleteId = $state("");
  let apiKey = $state("");
  let busy = $state(false);
  let error = $state("");
  let result = $state("");

  // load current connection status on mount
  $effect(() => {
    let alive = true;
    api
      .intervalsStatus()
      .then((s) => {
        if (!alive) return;
        status = s;
        athleteId = s.athleteId || "";
      })
      .catch(() => {})
      .finally(() => {
        if (alive) loading = false;
      });
    return () => (alive = false);
  });

  async function connect() {
    error = "";
    result = "";
    if (!athleteId.trim() || !apiKey.trim()) {
      error = "Bitte Athlete-ID und API-Key eingeben.";
      return;
    }
    busy = true;
    try {
      status = await api.intervalsConnect(athleteId.trim(), apiKey.trim());
      apiKey = "";
    } catch (e) {
      error = e.message || "Verbinden fehlgeschlagen.";
    } finally {
      busy = false;
    }
  }

  async function disconnect() {
    error = "";
    result = "";
    busy = true;
    try {
      status = await api.intervalsDisconnect();
      athleteId = "";
    } catch (e) {
      error = e.message || "Trennen fehlgeschlagen.";
    } finally {
      busy = false;
    }
  }

  // Map a normalized intervals.icu activity to the app's metric labels.
  function metricsFor(a) {
    const m = {};
    if (a.durationMin != null) m["Dauer (min)"] = a.durationMin;
    if (a.distanceKm != null) m["Distanz (km)"] = a.distanceKm;
    if (a.hr != null) m["Puls ø"] = a.hr;
    if (a.watts != null) m["Watt ø"] = a.watts;
    return m;
  }

  async function syncWeek() {
    error = "";
    result = "";
    if (!goal) {
      error = "Kein aktives Ziel.";
      return;
    }
    const week = weekDates();
    const dates = Object.values(week).sort();
    const oldest = dates[0];
    const newest = dates[dates.length - 1];

    busy = true;
    try {
      const { activities } = await api.intervalsActivities(oldest, newest);
      let imported = 0;
      for (const a of activities || []) {
        if (!a.date || a.date < oldest || a.date > newest) continue;
        const dk = dayKeyOf(a.date);
        const day = goal.days?.[dk];
        // skip rest days, unplanned days and already-logged days
        if (!day || day.isRest) continue;
        if (isCompleted(goal, a.date)) continue;
        const metrics = metricsFor(a);
        updateLogEntry(goal.id, a.date, { metrics, note: a.name || "" }, dk);
        imported++;
      }
      result =
        imported > 0
          ? `${imported} Einheit${imported === 1 ? "" : "en"} importiert.`
          : "Keine neuen Einheiten gefunden.";
    } catch (e) {
      error = e.message || "Synchronisierung fehlgeschlagen.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="subpage-head">
  <button class="back-btn" onclick={() => onback?.()} aria-label="Zurück">‹</button>
  <h2>Uhr / Tracker verbinden</h2>
</div>

<section class="card">
  <p class="lead">
    RxZone liest deine Aktivitäten über <strong>intervals.icu</strong> — egal von welchem
    Gerät. Direkt verbindbar sind u.a. <strong>Garmin, Strava, Polar, Wahoo, COROS</strong> und
    Suunto. Eine <strong>Apple Watch</strong> geht über Strava (oder eine Export-App wie HealthFit).
    Verknüpfe dein Gerät einmalig mit intervals.icu, dann kannst du hier deine Trainingswoche
    automatisch ausfüllen lassen.
  </p>

  <ol class="steps">
    <li>Bei <strong>intervals.icu</strong> registrieren und dein Gerät verknüpfen (Garmin, Strava, Apple Watch via Strava …).</li>
    <li>In den intervals.icu-Einstellungen unter <em>Developer</em> den API-Key kopieren.</li>
    <li>Athlete-ID und API-Key unten eintragen.</li>
  </ol>

  {#if loading}
    <p class="muted">Lädt …</p>
  {:else if status.connected}
    <div class="status connected">
      <span class="dot" aria-hidden="true"></span>
      Verbunden — Athlete-ID <strong>{status.athleteId}</strong>
    </div>

    <button class="btn btn-primary block" onclick={syncWeek} disabled={busy}>
      {busy ? "Synchronisiere …" : "Diese Woche synchronisieren"}
    </button>
    <button class="btn btn-ghost block" onclick={disconnect} disabled={busy}>
      Verbindung trennen
    </button>
  {:else}
    <div class="field">
      <label for="iv-id">Athlete-ID</label>
      <input id="iv-id" bind:value={athleteId} placeholder="z.B. i123456" autocomplete="off" />
    </div>
    <div class="field">
      <label for="iv-key">API-Key</label>
      <input id="iv-key" type="password" bind:value={apiKey} placeholder="aus intervals.icu" autocomplete="off" />
    </div>
    <button class="btn btn-primary block" onclick={connect} disabled={busy}>
      {busy ? "Verbinde …" : "Verbinden"}
    </button>
  {/if}

  {#if error}<p class="msg error">{error}</p>{/if}
  {#if result}<p class="msg ok">{result}</p>{/if}
</section>

<style>
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px 24px;
    margin-bottom: 20px;
  }
  .lead {
    font-size: 14.5px;
    line-height: 1.5;
    color: var(--text-muted);
  }
  .lead strong {
    color: var(--text);
  }
  .steps {
    margin: 16px 0 20px;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    color: var(--text-muted);
  }
  .steps strong {
    color: var(--text);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }
  .field label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .field input {
    padding: 11px 12px;
    font-size: 15px;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14.5px;
    margin-bottom: 16px;
  }
  .status.connected .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--c-zone2, #5fb87a);
  }
  .status strong {
    color: var(--text);
  }
  .block {
    width: 100%;
    margin-top: 10px;
  }
  .msg {
    margin-top: 14px;
    font-size: 14px;
  }
  .msg.error {
    color: var(--c-danger, #e5534b);
  }
  .msg.ok {
    color: var(--c-zone2, #5fb87a);
  }
</style>
