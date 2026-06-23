<script>
  import { api } from "../api.js";

  import { sportIcon } from "../icons.js";

  let { activity: a } = $props();
  let Icon = $derived(sportIcon(a.actType || a.klasse));

  let open = $state(false);
  let tab = $state("pace");
  let splits = $state({ loading: false, data: null, error: null });

  const dash = "—";
  function fmtDur(sec) {
    if (!(sec > 0)) return dash;
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const p = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
  }
  function fmtPaceSec(sec) {
    if (!(sec > 0)) return dash;
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  let paceSec = $derived(a.km > 0 && a.durSec > 0 ? a.durSec / a.km : null);
  let speed = $derived(a.km > 0 && a.durSec > 0 ? Math.round((a.km / (a.durSec / 3600)) * 10) / 10 : null);
  let form = $derived(a.ctl != null && a.atl != null ? Math.round(a.ctl - a.atl) : null);
  function val(v, unit = "") { return v == null ? dash : unit ? `${v}${unit}` : `${v}`; }

  async function toggle() {
    open = !open;
    if (open && a.actId && !splits.data && !splits.loading) {
      splits = { loading: true, data: null, error: null };
      try {
        const r = await api.intervalsSplits(a.actId);
        splits = { loading: false, data: r.splits || [], error: null };
      } catch (e) {
        splits = { loading: false, data: null, error: e.message || "Keine Detaildaten." };
      }
    }
  }

  // ---- Chart.js (lazy) ----
  let ChartLib = null;
  function chartjs(node, config) {
    let c = null, killed = false;
    (async () => {
      if (!ChartLib) {
        ChartLib = (await import("chart.js/auto")).default;
        ChartLib.defaults.color = "#64748b";
        ChartLib.defaults.font.family = "Inter";
        ChartLib.defaults.font.size = 10;
      }
      if (killed) return;
      c = new ChartLib(node, config);
    })();
    return { destroy() { killed = true; c?.destroy(); } };
  }
  const GRID = "rgba(255,255,255,0.05)";
  const TIP = { backgroundColor: "#1c2333", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, padding: 10 };
  const zoneFill = (z) => (z === "Z5" ? "rgba(239,68,68,0.7)" : z === "Z4" ? "rgba(249,115,22,0.65)" : z === "Z3" ? "rgba(234,179,8,0.55)" : "rgba(34,197,94,0.5)");

  let labels = $derived((splits.data ?? []).map((s) => s.km + " km"));
  let chartCfg = $derived.by(() => {
    const d = splits.data ?? [];
    if (tab === "pace") {
      return {
        type: "line",
        data: { labels, datasets: [{ data: d.map((s) => s.paceSec), borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.1)", borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#f97316", tension: 0.35, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (ctx) => " " + fmtPaceSec(ctx.raw) + " min/km" } } }, scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { reverse: true, grid: { color: GRID }, border: { display: false }, ticks: { callback: (v) => fmtPaceSec(v) } } } },
      };
    }
    if (tab === "hf") {
      return {
        type: "bar",
        data: { labels, datasets: [{ data: d.map((s) => s.hf), backgroundColor: d.map((s) => zoneFill(s.zone)), borderRadius: 3, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (ctx) => " " + ctx.raw + " bpm" } } }, scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, ticks: { callback: (v) => v + " bpm" } } } },
      };
    }
    return {
      type: "line",
      data: { labels, datasets: [{ data: d.map((s) => s.cadence), borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.1)", borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#06b6d4", tension: 0.35, fill: true }] },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (ctx) => " " + ctx.raw + " spm" } } }, scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { grid: { color: GRID }, border: { display: false }, ticks: { callback: (v) => v + " spm" } } } },
    };
  });
  let hasCadence = $derived((splits.data ?? []).some((s) => s.cadence != null));
  let hasHf = $derived((splits.data ?? []).some((s) => s.hf != null));
</script>

<div class="act-row" class:open>
  <div class="act-summary" onclick={toggle} role="button" tabindex="0" onkeydown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}>
    <div class="act-icon" style="background:color-mix(in srgb, {a.color} 16%, transparent);color:{a.color}"><Icon size={16} /></div>
    <div class="act-info">
      <div class="act-name">{a.name}</div>
      <div class="act-date">{a.dateLabel}{#if a.klasse} · {a.klasse}{/if}</div>
    </div>
    <div class="act-pills">
      {#if a.km != null}<span class="pill">{a.km} km</span><span class="sep">·</span>{/if}
      <span class="pill">{fmtDur(a.durSec)}</span>
      {#if paceSec}<span class="sep">·</span><span class="pill">{fmtPaceSec(paceSec)} /km</span>{/if}
      {#if a.hf}<span class="sep">·</span><span class="pill hf">{a.hf} bpm</span>{/if}
    </div>
    <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
  </div>

  {#if open}
    <div class="act-detail">
      <div class="m-grid">
        <div class="m"><div class="m-l">Distanz</div><div class="m-v">{val(a.km)}</div><div class="m-u">km</div></div>
        <div class="m"><div class="m-l">Dauer</div><div class="m-v" style="font-size:15px">{fmtDur(a.durSec)}</div><div class="m-u">hh:mm:ss</div></div>
        <div class="m"><div class="m-l">Ø Tempo</div><div class="m-v">{fmtPaceSec(paceSec)}</div><div class="m-u">min/km</div></div>
        <div class="m"><div class="m-l">Ø Geschw.</div><div class="m-v">{val(speed)}</div><div class="m-u">km/h</div></div>
        <div class="m"><div class="m-l">Höhenmeter</div><div class="m-v">{val(a.elev)}</div><div class="m-u">m</div></div>
        <div class="m"><div class="m-l">Klasse</div><div class="m-v" style="font-size:13px;color:var(--c-success)">{a.klasse || dash}</div><div class="m-u">Trainingstyp</div></div>
      </div>

      <div class="sec-grid">
        <div class="sec"><div class="sec-l">HF Ø / Max</div><div class="sec-v">{val(a.hf)} <span class="muted">/ {val(a.maxHr)} bpm</span></div></div>
        <div class="sec"><div class="sec-l">Kadenz</div><div class="sec-v">{val(a.cadence)} <span class="muted">spm</span></div></div>
        <div class="sec"><div class="sec-l">Intensität</div><div class="sec-v">{a.intensity != null ? a.intensity + "%" : dash}</div></div>
        <div class="sec"><div class="sec-l">Kalorien</div><div class="sec-v">{val(a.calories)} <span class="muted">kcal</span></div></div>
      </div>

      <div class="load-grid">
        <div class="load"><div class="load-l">Belastung</div><div class="load-v" style="color:var(--c-streak)">{val(a.load)}</div><div class="load-s">Training Load</div></div>
        <div class="load"><div class="load-l">TRIMP</div><div class="load-v" style="color:var(--c-cyan)">{val(a.trimp)}</div><div class="load-s">Fitness {val(a.ctl)} · Ermüdung {val(a.atl)}</div></div>
        <div class="load"><div class="load-l">Form (TSB)</div><div class="load-v" style="color:{form == null ? 'var(--text-muted)' : form < -5 ? 'var(--c-streak)' : form >= 5 ? 'var(--c-success)' : 'var(--c-yellow)'}">{form == null ? dash : form}</div><div class="load-s">{form == null ? "—" : form < -5 ? "Belastet" : form >= 5 ? "Frisch" : "Neutral"}</div></div>
      </div>

      {#if a.actId}
        <div class="charts">
          <div class="ctabs">
            <button class="ctab" class:on={tab === "pace"} onclick={() => (tab = "pace")}>Tempo</button>
            {#if hasHf}<button class="ctab" class:on={tab === "hf"} onclick={() => (tab = "hf")}>Herzfrequenz</button>{/if}
            {#if hasCadence}<button class="ctab" class:on={tab === "kad"} onclick={() => (tab = "kad")}>Kadenz</button>{/if}
          </div>
          <div class="cpanel">
            {#if splits.loading}
              <p class="hint">Lade Detaildaten …</p>
            {:else if splits.error || !(splits.data && splits.data.length)}
              <p class="hint">Keine Streams/Splits für diese Aktivität.</p>
            {:else}
              {#key tab + labels.length}<canvas use:chartjs={chartCfg} height="80"></canvas>{/key}
            {/if}
          </div>
        </div>

        {#if splits.data && splits.data.length}
          <div class="splits">
            <div class="splits-title">Kilometer-Splits</div>
            <table>
              <thead><tr><th>Km</th><th>Pace</th><th>HF</th><th>HF %</th><th>Zone</th></tr></thead>
              <tbody>
                {#each splits.data as s (s.km)}
                  <tr>
                    <td>{s.km} km</td>
                    <td>{fmtPaceSec(s.paceSec)}</td>
                    <td>{s.hf ?? dash}</td>
                    <td>{s.hfPct != null ? s.hfPct + "%" : dash}</td>
                    <td>{#if s.zone}<span class="zb {s.zone.toLowerCase()}">{s.zone}</span>{:else}{dash}{/if}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {:else}
        <p class="hint" style="padding:14px 20px">Detaildaten (Splits, Charts) verfügbar nach erneutem Sync mit intervals.icu.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .act-row { border-bottom: 1px solid var(--border); }
  .act-row:last-child { border-bottom: none; }
  .act-summary { display: flex; align-items: center; gap: 12px; padding: 13px 20px; cursor: pointer; user-select: none; transition: background 0.1s; }
  .act-summary:hover, .act-row.open .act-summary { background: var(--card-hover); }
  .act-icon { width: 36px; height: 36px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 15px; }
  .act-info { flex: 1; min-width: 0; }
  .act-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .act-date { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
  .act-pills { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .pill { font-size: 11px; font-weight: 700; color: var(--text-muted); font-family: var(--mono); white-space: nowrap; }
  .pill.hf { color: #ef4444; }
  .sep { color: var(--text-dim); font-size: 10px; }
  .chev { color: var(--text-dim); flex-shrink: 0; transition: transform 0.2s; }
  .act-row.open .chev { transform: rotate(90deg); }

  .act-detail { border-top: 1px solid var(--border); }
  .m-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1px; background: var(--border); border-bottom: 1px solid var(--border); }
  .m { background: var(--surface-3); padding: 12px 14px; }
  .m-l { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); margin-bottom: 5px; }
  .m-v { font-size: 18px; font-weight: 800; color: var(--text); font-family: var(--mono); line-height: 1; }
  .m-u { font-size: 10px; font-weight: 600; color: var(--text-muted); margin-top: 3px; }

  .sec-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border-bottom: 1px solid var(--border); }
  .sec { background: var(--card-hover); padding: 10px 14px; }
  .sec-l { font-size: 10px; color: var(--text-dim); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
  .sec-v { font-size: 13px; font-weight: 700; color: var(--text); font-family: var(--mono); }
  .muted { color: var(--text-dim); }

  .load-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border-bottom: 1px solid var(--border); }
  .load { background: var(--card-hover); padding: 12px 16px; }
  .load-l { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); margin-bottom: 4px; }
  .load-v { font-size: 22px; font-weight: 800; font-family: var(--mono); line-height: 1; }
  .load-s { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

  .charts { border-bottom: 1px solid var(--border); }
  .ctabs { display: flex; padding: 0 20px; border-bottom: 1px solid var(--border); }
  .ctab { padding: 10px 14px; font-size: 11px; font-weight: 600; color: var(--text-dim); cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: var(--font); }
  .ctab.on { color: var(--text); border-bottom-color: var(--accent); }
  .cpanel { padding: 14px 20px 16px; }
  .hint { font-size: 12px; color: var(--text-muted); padding: 8px 0; }

  .splits { padding: 14px 20px 18px; }
  .splits-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); text-align: right; padding: 5px 8px; border-bottom: 1px solid var(--border); }
  th:first-child { text-align: left; }
  td { font-size: 12px; font-family: var(--mono); color: var(--text-muted); padding: 7px 8px; border-bottom: 1px solid var(--border); text-align: right; }
  td:first-child { color: var(--text-dim); font-size: 11px; text-align: left; }
  tr:last-child td { border-bottom: none; }
  .zb { display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; }
  .zb.z1, .zb.z2 { background: rgba(34,197,94,0.15); color: var(--c-success); }
  .zb.z3 { background: rgba(234,179,8,0.15); color: var(--c-yellow); }
  .zb.z4 { background: rgba(249,115,22,0.15); color: var(--c-streak); }
  .zb.z5 { background: rgba(239,68,68,0.15); color: #ef4444; }

  @media (max-width: 720px) {
    .m-grid { grid-template-columns: repeat(3, 1fr); }
    .sec-grid { grid-template-columns: repeat(2, 1fr); }
    .act-pills .pill.hf, .act-pills .sep { display: none; }
  }
</style>
