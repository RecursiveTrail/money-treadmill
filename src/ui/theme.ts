export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'theme';
export function readTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' ? 'light' : 'dark';
}
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(STORAGE_KEY, theme);
}
export function toggleTheme(current: Theme): Theme {
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
