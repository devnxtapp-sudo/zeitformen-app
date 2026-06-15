<script>
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

<section class="card">
  <div class="fields">
    <div class="field">
      <label for="pc-dist">Distanz (km)</label>
      <input
        id="pc-dist"
        type="text"
        inputmode="decimal"
        bind:value={distance}
        placeholder="z.B. 10"
      />
    </div>
    <div class="field">
      <label for="pc-time">Zeit</label>
      <input
        id="pc-time"
        type="text"
        inputmode="numeric"
        bind:value={timeStr}
        placeholder="mm:ss oder hh:mm:ss"
      />
    </div>
  </div>

  <div class="results">
    <div class="result">
      <span class="val">{fmtPace(paceSec)}</span>
      <span class="unit">min/km</span>
    </div>
    <div class="result">
      <span class="val">{valid ? speed.toFixed(1) : "–"}</span>
      <span class="unit">km/h</span>
    </div>
  </div>
</section>

<section class="card">
  <h3 class="sec-title">Endzeiten bei dieser Pace</h3>
  {#if valid}
    <ul class="race-list">
      {#each RACES as r (r.km)}
        <li class="race">
          <span class="race-name">{r.label}</span>
          <span class="race-time">{fmtTime(paceSec * r.km)}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted hint">Distanz und Zeit eingeben, um die Endzeiten zu sehen.</p>
  {/if}
</section>

<style>
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px 24px;
    margin-bottom: 20px;
  }
  .fields {
    display: flex;
    gap: 14px;
  }
  .field {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
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
  .results {
    display: flex;
    gap: 14px;
    margin-top: 20px;
  }
  .result {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 10px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .result .val {
    font-size: 30px;
    font-weight: 800;
    line-height: 1;
    color: var(--accent);
  }
  .result .unit {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .sec-title {
    font-size: 15px;
    margin: 0 0 14px;
  }
  .race-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .race {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 0;
    border-bottom: 1px solid var(--border);
  }
  .race:last-child {
    border-bottom: none;
  }
  .race-name {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--text);
  }
  .race-time {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .hint {
    font-size: 14px;
    margin: 0;
  }
</style>
