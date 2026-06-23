// Light/dark theme: persisted in localStorage, applied as a class on <html>.
// The actual colour overrides live in app.css under `html.light`. Flowbite's
// dark variant keys off the `.dark` class, so light mode drops it.
const KEY = "rxz-theme";

function read() {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export const theme = $state({ mode: read() });

export function applyTheme(mode) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.toggle("dark", mode !== "light");
  el.classList.toggle("light", mode === "light");
  el.style.colorScheme = mode === "light" ? "light" : "dark";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", mode === "light" ? "#f8fafc" : "#0f1117");
}

export function setTheme(mode) {
  theme.mode = mode === "light" ? "light" : "dark";
  try {
    localStorage.setItem(KEY, theme.mode);
  } catch {
    /* ignore */
  }
  applyTheme(theme.mode);
}

export function toggleTheme() {
  setTheme(theme.mode === "light" ? "dark" : "light");
}
