import { beforeEach, describe, expect, it, vi } from 'vitest';

const values = new Map<string, string>();
const toggleClass = vi.fn();

beforeEach(() => {
  values.clear();
  toggleClass.mockClear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal('document', {
    documentElement: {
      classList: { toggle: toggleClass },
    },
  });
});

describe('theme', () => {
  it('defaults to dark and reads a saved light preference', async () => {
    const { readTheme } = await import('./theme');

    expect(readTheme()).toBe('dark');
    values.set('theme', 'light');
    expect(readTheme()).toBe('light');
  });

  it('applies and toggles the theme', async () => {
    const { applyTheme, toggleTheme } = await import('./theme');

    applyTheme('dark');
    expect(toggleClass).toHaveBeenCalledWith('dark', true);
    expect(values.get('theme')).toBe('dark');

    expect(toggleTheme('dark')).toBe('light');
    expect(toggleClass).toHaveBeenLastCalledWith('dark', false);
    expect(values.get('theme')).toBe('light');
  });
});
