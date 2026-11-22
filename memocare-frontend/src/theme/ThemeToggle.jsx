import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getTheme, setTheme } from './theme';

export default function ThemeToggle({ floating = false }) {
  const [theme, setLocal] = useState(getTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className={'theme-toggle' + (floating ? ' theme-toggle-floating' : '')}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => { setTheme(next); setLocal(next); }}
    >
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
