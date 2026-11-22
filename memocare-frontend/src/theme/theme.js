const KEY = 'memocare-theme';
export function getTheme() {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* storage may be unavailable */ }
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0F1B1A' : '#17645E');
}
export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  applyTheme(theme);
}
export function initTheme() { applyTheme(getTheme()); }
