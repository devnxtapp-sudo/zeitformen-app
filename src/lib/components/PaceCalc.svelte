<script>
  import { Input, Label } from "flowbite-svelte";

  let { onback } = $props();

  // Standard race distances (km) for the finish-time table.
  const RACES = [
    { label: "5 km", km: 5 },
    { label: "10 km", km: 10 },
    { label: "Halbmarathon", km: 21.0975 },
    { label: "Marathon", km: 42.195 },
  ];

  let distance = $state("10"); // km
  let timeStr = $state("50:00"); // hh:mm:ss or mm:ss

  // Parse "hh:mm:ss" / "mm:ss" / "ss" into total seconds (null if invalid).
  function toSeconds(str) {
    const s = String(str).trim();
    if (!s) return null;
    const parts = s.split(":").map((p) => p.trim());
    if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;
    const nums = parts.map(Number);
    let sec = 0;
    if (nums.length === 1) sec = nums[0];
    else if (nums.length === 2) sec = nums[0] * 60 + nums[1];
    else if (nums.length === 3) sec = nums[0] * 3600 + nums[1] * 60 + nums[2];
    else return null;
    return sec >= 0 ? sec : null;
  }

  // Seconds -> "h:mm:ss" (drops the hour part when zero).
  function fmtTime(sec) {
    if (sec == null || !isFinite(sec)) return "–";
    const total = Math.round(sec);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  }

  // Seconds-per-km -> "m:ss /km".
  function fmtPace(secPerKm) {
    if (secPerKm == null || !isFinite(secPerKm)) return "–";
    const total = Math.round(secPerKm);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  let km = $derived(Number(String(distance).replace(",", ".")));
  let totalSec = $derived(toSeconds(timeStr));
  let valid = $derived(km > 0 && totalSec != null && totalSec > 0);

  let paceSec = $derived(valid ? totalSec / km : null); // s/km
  let speed = $derived(valid ? km / (totalSec / 3600) : null); // km/h
</script>

<div class="subpage-head">
  <button class="back-btn" onclick={() => onback?.()} aria-label="Zurück">‹</button>
  <h2>Pace-Rechner</h2>
</div>

<section class="mb-5 rounded-xl border border-line bg-card p-6">
  <div class="flex gap-3.5">
    <div class="flex-1">
      <Label for="pc-dist" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Distanz (km)</Label>
      <Input
        id="pc-dist"
        type="text"
        inputmode="decimal"
        bind:value={distance}
        placeholder="z.B. 10"
      />
    </div>
    <div class="flex-1">
      <Label for="pc-time" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Zeit</Label>
      <Input
        id="pc-time"
        type="text"
        inputmode="numeric"
        bind:value={timeStr}
        placeholder="mm:ss oder hh:mm:ss"
      />
    </div>
  </div>

  <div class="mt-5 flex gap-3.5">
    <div class="flex flex-1 flex-col items-center gap-1 rounded-xl border border-line bg-surface-elev px-2.5 py-4">
      <span class="text-3xl font-extrabold leading-none text-[var(--accent)]">{fmtPace(paceSec)}</span>
      <span class="text-xs font-semibold text-ink-muted">min/km</span>
    </div>
    <div class="flex flex-1 flex-col items-center gap-1 rounded-xl border border-line bg-surface-elev px-2.5 py-4">
      <span class="text-3xl font-extrabold leading-none text-[var(--accent)]">{valid ? speed.toFixed(1) : "–"}</span>
      <span class="text-xs font-semibold text-ink-muted">km/h</span>
    </div>
  </div>
</section>

<section class="mb-5 rounded-xl border border-line bg-card p-6">
  <h3 class="mb-3.5 text-lg font-semibold">Endzeiten bei dieser Pace</h3>
  {#if valid}
    <ul class="flex list-none flex-col p-0">
      {#each RACES as r (r.km)}
        <li class="flex items-center justify-between border-b border-line py-2.5 last:border-b-0">
          <span class="text-sm font-semibold text-ink">{r.label}</span>
          <span class="text-sm font-bold tabular-nums text-ink">{fmtTime(paceSec * r.km)}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="m-0 text-sm text-ink-muted">Distanz und Zeit eingeben, um die Endzeiten zu sehen.</p>
  {/if}
</section>
