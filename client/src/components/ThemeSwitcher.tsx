import { Sun, Moon, Monitor } from 'lucide-react';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeSwitcherProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

export const ThemeSwitcher = ({ themeMode, onThemeChange }: ThemeSwitcherProps) => {
  const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: 'light', label: 'Light theme', icon: Sun },
    { mode: 'dark', label: 'Dark theme', icon: Moon },
    { mode: 'system', label: 'Match system theme', icon: Monitor }
  ];

  return (
    <div className="segmented" role="group" aria-label="Theme">
      {options.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onThemeChange(mode)}
          aria-pressed={themeMode === mode}
          aria-label={label}
          title={label}
          className="!px-2"
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
};
