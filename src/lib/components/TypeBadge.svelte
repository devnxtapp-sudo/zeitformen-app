<script>
  // A pill badge tinted with the training type's color.
  let { label, color = "#9aa0a6", size = "md" } = $props();

  // hex -> rgba for a subtle tinted background
  function tint(hex, a) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
</script>

<span
  class="badge"
  class:sm={size === "sm"}
  style="color: {color}; background: {tint(color, 0.14)}; border: 1px solid {tint(color, 0.32)};"
>
  {label}
</span>

<style>
  .badge.sm {
    font-size: 11px;
    padding: 2px 8px;
  }
</style>
