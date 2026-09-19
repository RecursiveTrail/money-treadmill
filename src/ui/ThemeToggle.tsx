import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { applyTheme, readTheme, toggleTheme, type Theme } from './theme';
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    const next = readTheme();
    applyTheme(next);
    setTheme(next);
  }, []);
  return (
    <button type="button" className="rounded bg-[var(--btn)] px-3 py-1" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme((current) => toggleTheme(current))}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
