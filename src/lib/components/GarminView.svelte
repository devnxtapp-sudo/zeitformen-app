<script>
  import { api } from "../api.js";
  import { activeGoal, updateLogEntry, isCompleted } from "../store.svelte.js";
  import { weekDates, dayKeyOf, parseYmd, ymd } from "../dateutil.js";
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
        // intra-activity distance best efforts (optional; only for runs)
        if (a.id && /run/i.test(a.type || "") && a.distanceKm > 0) {
          try {
            const { bestEfforts } = await api.intervalsBestEfforts(a.id);
            if (bestEfforts && Object.keys(bestEfforts).length) patch.bestEfforts = bestEfforts;
          } catch {
            /* best efforts are optional — ignore failures */
          }
        }
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

  // ---- full history import (all past activities, any day) ----
  let histBusy = $state(false);
  let histProgress = $state("");
  let histError = $state("");
  let histResult = $state("");

  // German label + colour from an activity type — used for days without a plan.
  function actTypeMeta(type) {
    const t = String(type || "").toLowerCase();
    if (/run/.test(t)) return { label: "Lauf", color: "#5fb87a" };
    if (/ride|bike|cycl|virtual/.test(t)) return { label: "Radfahren", color: "#3b82f6" };
    if (/swim/.test(t)) return { label: "Schwimmen", color: "#06b6d4" };
    if (/weight|strength|workout/.test(t)) return { label: "Kraft", color: "#f0a830" };
    if (/walk|hike/.test(t)) return { label: "Gehen", color: "#a78bfa" };
    if (/row/.test(t)) return { label: "Rudern", color: "#22d3ee" };
    return { label: type || "Training", color: "#9aa0a6" };
  }

  function shiftYmd(dateStr, { months = 0, days = 0 }) {
    const d = parseYmd(dateStr);
    if (months) d.setMonth(d.getMonth() + months);
    if (days) d.setDate(d.getDate() + days);
    return ymd(d);
  }

  // Reuse the slot already holding this activity (idempotent re-import), else the
  // lowest free slot — so multiple activities on one day don't clobber each other.
  function slotForActivity(g, a) {
    const log = g.log ?? {};
    const used = new Set();
    for (let s = 0; s < 40; s++) {
      const e = log[s > 0 ? `${a.date}#${s}` : a.date];
      if (!e) continue;
      if (e.actId === a.id) return s;
      used.add(s);
    }
    let s = 0;
    while (used.has(s)) s++;
    return s;
  }

  async function importActivity(a) {
    const dk = dayKeyOf(a.date);
    const slot = slotForActivity(goal, a);
    const patch = { metrics: metricsFor(a), note: a.name || "", actId: a.id };
    if (a.hrZoneTimes) patch.hrZones = a.hrZoneTimes;
    if (a.type) patch.actType = a.type;
    if (a.durationSec != null) patch.durationSec = a.durationSec;
    // unplanned / rest day → give the entry a label from the sport
    const planned = goal.days?.[dk];
    if (!planned || planned.isRest || !planned.typeId) {
      const m = actTypeMeta(a.type);
      patch.typeLabel = m.label;
      patch.typeColor = m.color;
    }
    if (/run/i.test(a.type || "") && a.distanceKm > 0) {
      try {
        const { bestEfforts } = await api.intervalsBestEfforts(a.id);
        if (bestEfforts && Object.keys(bestEfforts).length) patch.bestEfforts = bestEfforts;
      } catch {
        /* best efforts are optional */
      }
    }
    updateLogEntry(goal.id, a.date, patch, dk, slot);
  }

  async function importHistory() {
    histError = "";
    histResult = "";
    if (!goal) {
      histError = "Kein aktives Ziel.";
      return;
    }
    histBusy = true;
    let imported = 0;
    let runs = 0;
    try {
      let newest = ymd(new Date());
      const FLOOR = "2008-01-01";
      let emptyStreak = 0;
      // walk backwards in 6-month windows until the history runs dry
      while (emptyStreak < 3) {
        let oldest = shiftYmd(newest, { months: -6 });
        if (oldest < FLOOR) oldest = FLOOR;
        const { activities } = await api.intervalsActivities(oldest, newest);
        const list = (activities || []).filter((a) => a.date && a.date >= oldest && a.date <= newest);
        if (!list.length) {
          emptyStreak++;
        } else {
          emptyStreak = 0;
          list.sort((a, b) => (a.date < b.date ? 1 : -1));
          for (const a of list) {
            await importActivity(a);
            imported++;
            if (/run/i.test(a.type || "")) runs++;
            histProgress = `${imported} importiert … (bis ${oldest})`;
          }
        }
        if (oldest === FLOOR) break;
        newest = shiftYmd(oldest, { days: -1 });
      }
      histResult = `${imported} Aktivitäten importiert (${runs} Läufe mit Bestzeiten).`;
    } catch (e) {
      histError = (e.message || "Import fehlgeschlagen.") + " Bereits importierte Einheiten bleiben erhalten.";
    } finally {
      histBusy = false;
      histProgress = "";
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

    <Button color="primary" class="mt-2.5 w-full font-semibold text-[var(--on-accent)]" onclick={syncWeek} disabled={busy || histBusy}>
      {busy ? "Synchronisiere …" : "Diese Woche synchronisieren"}
    </Button>
    <Button color="alternative" class="mt-2.5 w-full" onclick={importHistory} disabled={busy || histBusy}>
      {histBusy ? (histProgress || "Importiere …") : "Alle vergangenen Aktivitäten importieren"}
    </Button>
    <p class="mt-1.5 text-xs leading-relaxed text-ink-dim">
      Holt deine gesamte intervals.icu-Historie (auch ungeplante Tage) inkl. Teilstrecken-Bestzeiten.
      Kann je nach Umfang etwas dauern; mehrfaches Ausführen erzeugt keine Duplikate.
    </p>
    <Button color="alternative" class="mt-2.5 w-full border-transparent bg-transparent" onclick={disconnect} disabled={busy || histBusy}>
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
  {#if histError}<Helper class="mt-3.5 text-sm" color="red">{histError}</Helper>{/if}
  {#if histResult}<Helper class="mt-3.5 text-sm text-zone2">{histResult}</Helper>{/if}
</section>
