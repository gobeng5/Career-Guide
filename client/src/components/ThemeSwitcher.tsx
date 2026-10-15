import { Sun, Moon, Monitor } from 'lucide-react';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeSwitcherProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  compact?: boolean;
}

export const ThemeSwitcher = ({
  themeMode,
  onThemeChange,
  compact = false
}: ThemeSwitcherProps) => {
  const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'system', label: 'System', icon: Monitor }
  ];

  return (
    <div className="flex items-center bg-blue-950/40 p-1 rounded-xl border border-blue-500/20 shadow-sm">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = themeMode === opt.mode;

        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => onThemeChange(opt.mode)}
            title={`Switch to ${opt.label} theme`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isSelected
                ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-blue-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {!compact && <span className="text-[11px]">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
