<script>
  import { api } from "../api.js";
  import { activeGoal, updateLogEntry, isCompleted } from "../store.svelte.js";
  import { weekDates, dayKeyOf } from "../dateutil.js";
  import { Button, Input, Label, Helper } from "flowbite-svelte";

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
        const patch = { metrics, note: a.name || "" };
        if (a.hrZoneTimes) patch.hrZones = a.hrZoneTimes;
        if (a.type) patch.actType = a.type;
        if (a.durationSec != null) patch.durationSec = a.durationSec;
        updateLogEntry(goal.id, a.date, patch, dk);
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

<section class="mb-5 rounded-xl border border-line bg-card p-6">
  <p class="text-sm leading-relaxed text-ink-muted [&_strong]:text-ink">
    RxZone liest deine Aktivitäten über <strong>intervals.icu</strong> — egal von welchem
    Gerät. Direkt verbindbar sind u.a. <strong>Garmin, Strava, Polar, Wahoo, COROS</strong> und
    Suunto. Eine <strong>Apple Watch</strong> geht über Strava (oder eine Export-App wie HealthFit).
    Verknüpfe dein Gerät einmalig mit intervals.icu, dann kannst du hier deine Trainingswoche
    automatisch ausfüllen lassen.
  </p>

  <ol class="mb-5 mt-4 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink-muted [&_strong]:text-ink">
    <li>Bei <strong>intervals.icu</strong> registrieren und dein Gerät verknüpfen (Garmin, Strava, Apple Watch via Strava …).</li>
    <li>In den intervals.icu-Einstellungen unter <em>Developer</em> den API-Key kopieren.</li>
    <li>Athlete-ID und API-Key unten eintragen.</li>
  </ol>

  {#if loading}
    <p class="text-sm text-ink-dim">Lädt …</p>
  {:else if status.connected}
    <div class="mb-4 flex items-center gap-2.5 text-sm text-ink [&_strong]:text-ink">
      <span class="h-2.5 w-2.5 rounded-full bg-zone2 shadow-[0_0_8px_rgba(95,184,122,0.7)]" aria-hidden="true"></span>
      Verbunden — Athlete-ID <strong>{status.athleteId}</strong>
    </div>

    <Button color="primary" class="mt-2.5 w-full font-semibold text-[var(--on-accent)]" onclick={syncWeek} disabled={busy}>
      {busy ? "Synchronisiere …" : "Diese Woche synchronisieren"}
    </Button>
    <Button color="alternative" class="mt-2.5 w-full border-transparent bg-transparent" onclick={disconnect} disabled={busy}>
      Verbindung trennen
    </Button>
  {:else}
    <div class="mb-3.5">
      <Label for="iv-id" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Athlete-ID</Label>
      <Input id="iv-id" bind:value={athleteId} placeholder="z.B. i123456" autocomplete="off" />
    </div>
    <div class="mb-3.5">
      <Label for="iv-key" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">API-Key</Label>
      <Input id="iv-key" type="password" bind:value={apiKey} placeholder="aus intervals.icu" autocomplete="off" />
    </div>
    <Button color="primary" class="mt-2.5 w-full font-semibold text-[var(--on-accent)]" onclick={connect} disabled={busy}>
      {busy ? "Verbinde …" : "Verbinden"}
    </Button>
  {/if}

  {#if error}<Helper class="mt-3.5 text-sm" color="red">{error}</Helper>{/if}
  {#if result}<Helper class="mt-3.5 text-sm text-zone2">{result}</Helper>{/if}
</section>
