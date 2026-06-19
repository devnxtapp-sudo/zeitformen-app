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
  class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold leading-snug {size ===
  'sm'
    ? 'px-2 py-0.5 text-[11px]'
    : 'px-2.5 py-[3px] text-xs'}"
  style="color: {color}; background: {tint(color, 0.14)}; border-color: {tint(color, 0.32)};"
>
  {label}
</span>
