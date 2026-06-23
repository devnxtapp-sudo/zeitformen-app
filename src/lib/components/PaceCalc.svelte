<script>
  import Zap from "@lucide/svelte/icons/zap";
  import Timer from "@lucide/svelte/icons/timer";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import Activity from "@lucide/svelte/icons/activity";
  import Flag from "@lucide/svelte/icons/flag";
  import List from "@lucide/svelte/icons/list";
  import Heart from "@lucide/svelte/icons/heart";

  let { onback } = $props();

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function fmtPace(s) {
    if (!s || s <= 0 || !isFinite(s)) return "–";
    return Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");
  }
  function fmtTime(s) {
    if (!s || s <= 0 || !isFinite(s)) return "–";
    return (
      String(Math.floor(s / 3600)).padStart(2, "0") + ":" +
      String(Math.floor((s % 3600) / 60)).padStart(2, "0") + ":" +
      String(Math.round(s % 60)).padStart(2, "0")
    );
  }
  function toSec(t) {
    const [h, m, s] = String(t).split(":").map(Number);
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
  }

  const MODES = [
    { id: "pace", label: "Pace berechnen", icon: Zap },
    { id: "time", label: "Zeit berechnen", icon: Timer },
    { id: "dist", label: "Distanz berechnen", icon: MapPin },
  ];

  let mode = $state("pace");
  let unit = $state("km");
  let splitUnit = $state("km");

  let dist = $state(10);
  let timeH = $state(0);
  let timeM = $state(50);
  let timeS = $state(0);
  let paceSec = $state(300); // sec per unit (source in time/dist modes)

  let distNum = $derived(Number(dist) || 0);
  let timeSec = $derived((Number(timeH) || 0) * 3600 + (Number(timeM) || 0) * 60 + (Number(timeS) || 0));

  let effPace = $derived.by(() => {
    if (mode === "pace") return distNum > 0 && timeSec > 0 ? timeSec / distNum : paceSec;
    return paceSec;
  });
  let effDist = $derived(mode === "dist" ? (paceSec > 0 ? timeSec / paceSec : 0) : distNum);
  let effTime = $derived.by(() => {
    if (mode === "time") return effPace * distNum;
    if (mode === "dist") return timeSec;
    return distNum > 0 && timeSec > 0 ? timeSec : effPace * distNum;
  });
  let speed = $derived(effPace > 0 ? 3600 / effPace : 0);
  let paceKm = $derived(unit === "km" ? effPace : effPace / 1.60934);

  // pace/speed editable views (used in time/dist modes)
  let paceMinVal = $derived(Math.floor(paceSec / 60));
  let paceSecVal = $derived(String(Math.round(paceSec % 60)).padStart(2, "0"));
  let speedVal = $derived((3600 / paceSec).toFixed(2));

  function setPace(m, s) { paceSec = clamp((Number(m) || 0) * 60 + (Number(s) || 0), 90, 1800); }
  function setSpeed(v) { const x = Number(v) || 0; if (x > 0) paceSec = clamp(3600 / x, 90, 1800); }

  let paceFill = $derived.by(() => {
    const p = clamp(1 - (paceSec - 90) / 1710, 0, 1) * 100;
    return `linear-gradient(to right, var(--orange) 0%, var(--orange) ${p}%, var(--surface-3) ${p}%, var(--surface-3) 100%)`;
  });
  let speedFill = $derived.by(() => {
    const p = clamp((3600 / paceSec - 3) / 37, 0, 1) * 100;
    return `linear-gradient(to right, var(--cyan) 0%, var(--cyan) ${p}%, var(--surface-3) ${p}%, var(--surface-3) 100%)`;
  });

  const KM_PRESETS = [
    { label: "5 km", d: 5 }, { label: "10 km", d: 10 }, { label: "HM", d: 21.0975 }, { label: "Marathon", d: 42.195 }, { label: "HYROX", d: 8 },
  ];
  const MI_PRESETS = [
    { label: "5 km", d: 3.107 }, { label: "10 km", d: 6.214 }, { label: "HM", d: 13.109 }, { label: "Marathon", d: 26.219 },
  ];
  let distPresets = $derived(unit === "km" ? KM_PRESETS : MI_PRESETS);

  const RACE_PRESETS = [
    { dist: 5, label: "5 km", targets: ["00:17:30", "00:20:00", "00:22:30", "00:25:00"] },
    { dist: 10, label: "10 km", targets: ["00:37:00", "00:42:00", "00:47:00", "00:55:00"] },
    { dist: 21.0975, label: "Halbmarathon", targets: ["01:20:00", "01:30:00", "01:45:00", "02:00:00"] },
    { dist: 42.195, label: "Marathon", targets: ["02:45:00", "03:00:00", "03:30:00", "04:00:00"] },
    { dist: 8, label: "HYROX", targets: ["00:55:00", "01:05:00", "01:15:00", "01:30:00"] },
  ];
  function applyRacePreset(d, t) {
    mode = "pace";
    unit = "km";
    dist = d;
    const sec = toSec(t);
    timeH = Math.floor(sec / 3600);
    timeM = Math.floor((sec % 3600) / 60);
    timeS = sec % 60;
  }

  const ZONES = [
    { name: "Zone 1", desc: "Regeneration", pct: [0.76, 0.85], color: "#94a3b8" },
    { name: "Zone 2", desc: "Grundlagenausdauer", pct: [0.85, 0.91], color: "var(--green)" },
    { name: "Zone 3", desc: "Aerobe Schwelle", pct: [0.91, 0.96], color: "var(--accent)" },
    { name: "Zone 4", desc: "Laktatschwelle", pct: [0.96, 1.02], color: "var(--orange)" },
    { name: "Zone 5", desc: "VO2max", pct: [1.02, 1.15], color: "var(--red)" },
  ];

  let splits = $derived.by(() => {
    const dk = unit === "km" ? effDist : effDist * 1.60934;
    if (!(dk > 0) || !(paceKm > 0)) return [];
    const perKm = splitUnit === "mi" ? 1.60934 : 1;
    const pacePer = paceKm * perKm;
    const totalUnits = dk / perKm;
    const n = Math.min(60, Math.ceil(totalUnits));
    const out = [];
    let elapsed = 0;
    for (let i = 1; i <= n; i++) {
      const frac = i === n ? totalUnits - (i - 1) : 1;
      const st = pacePer * frac;
      elapsed += st;
      out.push({ i, label: `${i} ${splitUnit}`, pace: fmtPace(pacePer), frac: Math.min(100, frac * 100), time: fmtTime(st), elapsed: fmtTime(elapsed) });
    }
    return out;
  });

  let primary = $derived.by(() => {
    if (mode === "time") return { label: "Gesamtzeit", val: fmtTime(effTime), unit: "hh:mm:ss" };
    if (mode === "dist") return { label: "Distanz", val: effDist > 0 ? effDist.toFixed(2) : "–", unit };
    return { label: "Pace", val: fmtPace(effPace), unit: "min/" + unit };
  });
</script>

<div class="pace">
  <div class="page-header">
    <div>
      <div class="page-title">Pace-Rechner</div>
      <div class="page-sub">Tempo, Zeit oder Distanz — alle Werte passen sich live an</div>
    </div>
  </div>

  <div class="mode-tabs">
    {#each MODES as m (m.id)}
      {@const MI = m.icon}
      <button class="mode-tab" class:active={mode === m.id} onclick={() => (mode = m.id)}>
        <MI size={14} /> {m.label}
      </button>
    {/each}
  </div>

  <div class="calc-grid">
    <!-- INPUT -->
    <div class="card">
      <div class="card-head">
        <div class="ch-icon" style="background:rgba(var(--accent-rgb),0.15)"><SlidersHorizontal size={14} style="color:var(--accent)" /></div>
        <div>
          <div class="card-title">{MODES.find((m) => m.id === mode).label}</div>
          <div class="card-sub">Regler verschieben oder Werte eintippen</div>
        </div>
      </div>
      <div class="card-body">
        {#if mode !== "dist"}
          <div class="inp-group">
            <div class="inp-label">Distanz</div>
            <div class="dist-presets">
              {#each distPresets as p (p.label)}
                <button class="dist-preset" class:active={Math.abs(p.d - distNum) < 0.01} onclick={() => (dist = p.d)}>{p.label}</button>
              {/each}
            </div>
            <div class="inp-row">
              <div class="inp-wrap">
                <input class="inp" type="number" min="0.1" step="0.01" bind:value={dist} />
                <span class="unit-lbl">{unit}</span>
              </div>
            </div>
          </div>
        {/if}

        {#if mode !== "time"}
          <div class="inp-group">
            <div class="inp-label">Zeit</div>
            <div class="inp-row">
              <div class="inp-wrap" style="max-width:80px"><input class="inp" type="number" min="0" max="99" bind:value={timeH} /><span class="unit-lbl">h</span></div>
              <div class="inp-sep">:</div>
              <div class="inp-wrap" style="max-width:80px"><input class="inp" type="number" min="0" max="59" bind:value={timeM} /><span class="unit-lbl">m</span></div>
              <div class="inp-sep">:</div>
              <div class="inp-wrap" style="max-width:80px"><input class="inp" type="number" min="0" max="59" bind:value={timeS} /><span class="unit-lbl">s</span></div>
            </div>
          </div>
        {/if}

        {#if mode !== "pace"}
          <div class="inp-group">
            <div class="inp-label">Pace</div>
            <div class="inp-row">
              <div class="inp-wrap" style="max-width:88px"><input class="inp" type="number" min="1" max="30" value={paceMinVal} oninput={(e) => setPace(e.target.value, paceSecVal)} /><span class="unit-lbl">min</span></div>
              <div class="inp-sep">:</div>
              <div class="inp-wrap" style="max-width:88px"><input class="inp" type="number" min="0" max="59" value={paceSecVal} oninput={(e) => setPace(paceMinVal, e.target.value)} /><span class="unit-lbl">s</span></div>
              <div class="mini-unit">min/{unit}</div>
            </div>
            <div class="slider-wrap">
              <div class="slider-row">
                <span class="slider-hint">langsam</span>
                <span class="slider-current" style="color:var(--orange)">{fmtPace(paceSec)} min/{unit}</span>
                <span class="slider-hint">schnell</span>
              </div>
              <input type="range" min="90" max="1800" step="1" value={paceSec} oninput={(e) => (paceSec = clamp(+e.target.value, 90, 1800))} style="background:{paceFill}" />
            </div>
          </div>

          <div class="inp-group">
            <div class="inp-label">Geschwindigkeit</div>
            <div class="inp-row">
              <div class="inp-wrap"><input class="inp" type="number" min="1" max="45" step="0.01" value={speedVal} oninput={(e) => setSpeed(e.target.value)} /><span class="unit-lbl">{unit === "km" ? "km/h" : "mph"}</span></div>
            </div>
            <div class="slider-wrap">
              <div class="slider-row">
                <span class="slider-hint">3</span>
                <span class="slider-current" style="color:var(--cyan)">{(3600 / paceSec).toFixed(2)} {unit === "km" ? "km/h" : "mph"}</span>
                <span class="slider-hint">40</span>
              </div>
              <input type="range" min="3" max="40" step="0.1" value={(3600 / paceSec).toFixed(1)} oninput={(e) => setSpeed(e.target.value)} style="background:{speedFill}" />
            </div>
          </div>
        {/if}

        <div class="unit-toggle">
          <button class="dist-preset sq" class:active={unit === "km"} onclick={() => (unit = "km")}>km / km/h</button>
          <button class="dist-preset sq" class:active={unit === "mi"} onclick={() => (unit = "mi")}>mi / mph</button>
        </div>
      </div>
    </div>

    <!-- RESULT -->
    <div class="card">
      <div class="card-head">
        <div class="ch-icon" style="background:var(--orange-dim)"><Activity size={14} style="color:var(--orange)" /></div>
        <div>
          <div class="card-title">Ergebnis</div>
          <div class="card-sub">{effDist > 0 ? `${effDist.toFixed(2)} ${unit} · ${fmtTime(effTime)}` : "Live-Berechnung"}</div>
        </div>
      </div>
      <div class="card-body">
        <div class="result-box primary">
          <div class="res-left">
            <div class="res-label">{primary.label}</div>
            <div class="res-val" style="color:var(--orange)">{primary.val}</div>
            <div class="res-unit">{primary.unit}</div>
          </div>
          <div class="res-icon" style="background:var(--orange-dim)"><Zap size={18} style="color:var(--orange)" /></div>
        </div>

        <div class="sec-grid">
          <div class="sec-box"><div class="sec-label">Geschwindigkeit</div><div class="sec-val" style="color:var(--cyan)">{speed.toFixed(2)}</div><div class="sec-unit">{unit === "km" ? "km/h" : "mph"}</div></div>
          <div class="sec-box"><div class="sec-label">Gesamtzeit</div><div class="sec-val" style="color:var(--accent)">{fmtTime(effTime)}</div><div class="sec-unit">hh:mm:ss</div></div>
          <div class="sec-box"><div class="sec-label">Halbmarathon</div><div class="sec-val" style="color:var(--purple)">{fmtTime(paceKm * 21.0975)}</div><div class="sec-unit">bei dieser Pace</div></div>
          <div class="sec-box"><div class="sec-label">Marathon</div><div class="sec-val" style="color:var(--yellow)">{fmtTime(paceKm * 42.195)}</div><div class="sec-unit">bei dieser Pace</div></div>
          <div class="sec-box"><div class="sec-label">5 km</div><div class="sec-val" style="color:var(--green)">{fmtTime(paceKm * 5)}</div><div class="sec-unit">bei dieser Pace</div></div>
          <div class="sec-box"><div class="sec-label">10 km</div><div class="sec-val" style="color:var(--red)">{fmtTime(paceKm * 10)}</div><div class="sec-unit">bei dieser Pace</div></div>
        </div>
      </div>
    </div>

    <!-- RACE PRESETS -->
    <div class="card full-width">
      <div class="card-head">
        <div class="ch-icon" style="background:var(--purple-dim)"><Flag size={14} style="color:var(--purple)" /></div>
        <div>
          <div class="card-title">Wettkampf-Zielzeiten</div>
          <div class="card-sub">Klicken → Werte werden übernommen</div>
        </div>
      </div>
      <div class="presets-grid">
        {#each RACE_PRESETS as p (p.label)}
          {#each p.targets as t (t)}
            <button class="preset-btn" onclick={() => applyRacePreset(p.dist, t)}>
              <div class="preset-dist">{p.label}</div>
              <div class="preset-time">{t}</div>
              <div class="preset-pace">{fmtPace(toSec(t) / p.dist)} /km</div>
            </button>
          {/each}
        {/each}
      </div>
    </div>

    <!-- SPLITS -->
    <div class="card full-width">
      <div class="splits-head">
        <div class="splits-head-title"><List size={13} style="color:var(--accent)" /> Split-Tabelle</div>
        <div class="split-toggle">
          <button class="split-btn" class:active={splitUnit === "km"} onclick={() => (splitUnit = "km")}>km</button>
          <button class="split-btn" class:active={splitUnit === "mi"} onclick={() => (splitUnit = "mi")}>Meilen</button>
        </div>
      </div>
      <div class="splits-body">
        {#if splits.length}
          <table class="splits-table">
            <thead><tr><th>{splitUnit.toUpperCase()}</th><th>Pace</th><th style="width:100%"></th><th class="r">Split</th><th class="r">Gesamt</th></tr></thead>
            <tbody>
              {#each splits as s (s.i)}
                <tr>
                  <td class="td-km">{s.label}</td>
                  <td class="td-pace">{s.pace}</td>
                  <td class="td-bar"><div class="pace-bar"><div class="pace-bar-fill" style="width:{s.frac}%"></div></div></td>
                  <td class="td-time">{s.time}</td>
                  <td class="td-elapsed">{s.elapsed}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="splits-empty">Distanz & Pace eingeben, um Splits zu sehen.</p>
        {/if}
      </div>
    </div>

    <!-- ZONES -->
    <div class="card full-width">
      <div class="card-head">
        <div class="ch-icon" style="background:var(--green-dim)"><Heart size={14} style="color:var(--green)" /></div>
        <div>
          <div class="card-title">Pace-Zonen</div>
          <div class="card-sub">Basierend auf Pace {fmtPace(effPace)} min/{unit}</div>
        </div>
      </div>
      <div>
        {#each ZONES as z (z.name)}
          <div class="zone-row">
            <div class="zone-dot" style="background:{z.color}"></div>
            <div class="zone-name" style="color:{z.color}">{z.name}</div>
            <div class="zone-desc">{z.desc}</div>
            <div class="zone-range">{fmtPace(effPace / z.pct[1])} – {fmtPace(effPace / z.pct[0])} min/{unit}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .pace {
    --surface: var(--card);
    --border-md: var(--border-strong);
    --text-faint: var(--text-dim);
    --green: var(--c-success);
    --orange: var(--c-streak);
    --cyan: var(--c-cyan);
    --purple: var(--c-purple);
    --red: #ef4444;
    --yellow: #eab308;
    --green-dim: rgba(34, 197, 94, 0.12);
    --orange-dim: rgba(249, 115, 22, 0.12);
    --purple-dim: rgba(167, 139, 250, 0.12);
    --r: 10px;
    --r-sm: 7px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .page-title { font-size: 22px; font-weight: 800; color: var(--text); }
  .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 3px; }

  .mode-tabs { display: flex; gap: 6px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r); padding: 5px; }
  .mode-tab { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 14px; border-radius: var(--r-sm); font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; border: none; background: none; font-family: var(--font); }
  .mode-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.2); }

  .calc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .full-width { grid-column: span 2; }
  @media (max-width: 900px) { .calc-grid { grid-template-columns: 1fr; } .full-width { grid-column: span 1; } }

  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
  .card-head { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
  .ch-icon { width: 30px; height: 30px; border-radius: var(--r-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .card-title { font-size: 13px; font-weight: 700; color: var(--text); }
  .card-sub { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
  .card-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 16px; }

  .inp-group { display: flex; flex-direction: column; gap: 6px; }
  .inp-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .inp-row { display: flex; gap: 8px; align-items: center; }
  .inp-wrap { flex: 1; position: relative; display: flex; align-items: center; }
  .unit-lbl { position: absolute; right: 10px; font-size: 11px; color: var(--text-faint); font-family: var(--mono); pointer-events: none; }
  .mini-unit { font-size: 10px; color: var(--text-faint); white-space: nowrap; align-self: center; }
  .inp { width: 100%; background: var(--surface-2); border: 1px solid var(--border-md); border-radius: var(--r-sm); color: var(--text); padding: 9px 38px 9px 12px; font-size: 15px; font-family: var(--mono); font-weight: 700; outline: none; }
  .inp:focus { border-color: var(--accent); }
  .inp-sep { font-size: 18px; font-weight: 700; color: var(--text-faint); flex-shrink: 0; }

  .slider-wrap { display: flex; flex-direction: column; gap: 6px; }
  .slider-row { display: flex; align-items: center; justify-content: space-between; }
  .slider-hint { font-size: 10px; color: var(--text-faint); }
  .slider-current { font-size: 12px; font-weight: 700; font-family: var(--mono); }
  input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 99px; outline: none; cursor: pointer; background: var(--surface-3); }
  input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--accent); border: 3px solid var(--surface); box-shadow: 0 0 0 2px var(--accent); cursor: pointer; }
  input[type="range"]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: var(--accent); border: 3px solid var(--surface); cursor: pointer; }

  .dist-presets { display: flex; flex-wrap: wrap; gap: 6px; }
  .dist-preset { padding: 4px 11px; border-radius: 99px; font-size: 11px; font-weight: 700; border: 1px solid var(--border-md); background: var(--surface-2); color: var(--text-muted); cursor: pointer; font-family: var(--font); }
  .dist-preset:hover { border-color: var(--accent); color: var(--accent); }
  .dist-preset.active { background: rgba(var(--accent-rgb), 0.15); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.3); }
  .dist-preset.sq { border-radius: var(--r-sm); padding: 6px 14px; }
  .unit-toggle { display: flex; gap: 6px; padding-top: 4px; border-top: 1px solid var(--border); }

  .result-box { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .result-box.primary { background: var(--surface-3); border-color: var(--border-md); }
  .res-left { display: flex; flex-direction: column; gap: 3px; }
  .res-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
  .res-val { font-size: 28px; font-weight: 800; font-family: var(--mono); line-height: 1; }
  .res-unit { font-size: 11px; color: var(--text-muted); }
  .res-icon { width: 40px; height: 40px; border-radius: var(--r-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  .sec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sec-box { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 12px 14px; }
  .sec-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px; }
  .sec-val { font-size: 18px; font-weight: 800; font-family: var(--mono); }
  .sec-unit { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

  .presets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; padding: 16px 20px; }
  .preset-btn { display: flex; flex-direction: column; gap: 3px; padding: 11px 14px; border-radius: var(--r-sm); background: var(--surface-2); border: 1px solid var(--border); cursor: pointer; text-align: left; font-family: var(--font); }
  .preset-btn:hover { border-color: var(--accent); background: rgba(var(--accent-rgb), 0.12); }
  .preset-dist { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
  .preset-time { font-size: 15px; font-weight: 800; font-family: var(--mono); color: var(--text); }
  .preset-pace { font-size: 11px; color: var(--orange); font-family: var(--mono); }

  .splits-head { padding: 12px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .splits-head-title { font-size: 13px; font-weight: 700; color: var(--text); display: inline-flex; align-items: center; gap: 7px; }
  .split-toggle { display: flex; gap: 4px; }
  .split-btn { padding: 4px 10px; border-radius: var(--r-sm); font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-md); background: transparent; color: var(--text-muted); font-family: var(--font); }
  .split-btn.active { background: rgba(var(--accent-rgb), 0.15); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.25); }
  .splits-body { max-height: 320px; overflow-y: auto; }
  .splits-empty { padding: 28px; text-align: center; color: var(--text-faint); font-size: 13px; }
  .splits-table { width: 100%; border-collapse: collapse; }
  .splits-table th { padding: 7px 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); text-align: left; border-bottom: 1px solid var(--border); }
  .splits-table th.r { text-align: right; }
  .splits-table td { padding: 9px 20px; font-size: 13px; border-bottom: 1px solid var(--border); }
  .splits-table tr:last-child td { border-bottom: none; }
  .td-km { font-family: var(--mono); font-weight: 600; color: var(--text-muted); }
  .td-pace { font-family: var(--mono); font-weight: 700; color: var(--orange); }
  .td-time { font-family: var(--mono); font-weight: 600; color: var(--text); text-align: right; white-space: nowrap; }
  .td-elapsed { font-family: var(--mono); font-weight: 600; color: var(--text-muted); text-align: right; white-space: nowrap; }
  .pace-bar { height: 5px; background: var(--surface-3); border-radius: 99px; overflow: hidden; }
  .pace-bar-fill { height: 100%; border-radius: 99px; background: var(--orange); }

  .zone-row { display: flex; align-items: center; gap: 10px; padding: 9px 20px; border-bottom: 1px solid var(--border); }
  .zone-row:last-child { border-bottom: none; }
  .zone-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .zone-name { font-size: 12px; font-weight: 700; width: 62px; flex-shrink: 0; }
  .zone-desc { font-size: 11px; color: var(--text-muted); flex: 1; }
  .zone-range { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--text); white-space: nowrap; }
</style>
