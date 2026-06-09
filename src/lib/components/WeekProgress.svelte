<script>
  import { DAY_KEYS } from "../seed.js";

  let { goal, week = {} } = $props();

  // planned sessions this week = non-rest days
  let planned = $derived(
    DAY_KEYS.filter((k) => !goal.days[k].isRest).length,
  );

  // completed this week = logged dates that fall on a non-rest weekday
  let doneThisWeek = $derived(
    DAY_KEYS.filter((k) => !goal.days[k].isRest && goal.log?.[week[k]]).length,
  );

  let pct = $derived(planned ? Math.round((doneThisWeek / planned) * 100) : 0);

  let totalAllTime = $derived(Object.keys(goal.log ?? {}).length);
</script>

<div class="progress">
  <div class="left">
    <div class="row">
      <span class="num">{doneThisWeek}<span class="den">/{planned}</span></span>
      <span class="lbl">Einheiten diese Woche</span>
    </div>
    <div class="bar">
      <div class="fill" style="width: {pct}%"></div>
    </div>
  </div>
  <div class="total">
    <span class="t-num">{totalAllTime}</span>
    <span class="t-lbl">erledigt insgesamt</span>
  </div>
</div>

<style>
  .progress {
    display: flex;
    align-items: center;
    gap: 20px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    margin-bottom: 18px;
  }
  .left {
    flex: 1 1 auto;
    min-width: 0;
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 10px;
  }
  .num {
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
  }
  .den {
    color: var(--text-dim);
    font-weight: 600;
  }
  .lbl {
    font-size: 13px;
    color: var(--text-muted);
  }
  .bar {
    height: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--c-zone2);
    border-radius: 999px;
    transition: width 0.3s ease;
  }
  .total {
    flex: 0 0 auto;
    text-align: center;
    padding-left: 18px;
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .t-num {
    font-size: 22px;
    font-weight: 700;
    color: var(--accent);
    line-height: 1;
  }
  .t-lbl {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  @media (max-width: 480px) {
    .total {
      padding-left: 12px;
    }
  }
</style>
