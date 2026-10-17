import { Target, FileCheck, Mail, PenLine, BookOpen, FileText, X, LogOut, LogIn } from 'lucide-react';
import type { AuthUser } from './LoginPage';
import { ThemeSwitcher, type ThemeMode } from './ThemeSwitcher';

export type ActiveTab = 'scorer' | 'rewriter' | 'letters' | 'humanizer';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenXYZModal: () => void;
  onLoadSampleData: () => void;
  scoreData: any | null;
  rewriteData: any | null;
  currentUser: AuthUser | null;
  onSignOut: () => void;
  onOpenLogin: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

export const Sidebar = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenXYZModal,
  onLoadSampleData,
  scoreData,
  rewriteData,
  currentUser,
  onSignOut,
  onOpenLogin,
  themeMode,
  onThemeChange
}: SidebarProps) => {
  const navItems = [
    {
      id: 'scorer' as ActiveTab,
      label: 'Resume score',
      icon: Target,
      badge: scoreData ? `${scoreData.overallScore}` : null
    },
    {
      id: 'rewriter' as ActiveTab,
      label: 'Tailor resume',
      icon: FileCheck,
      badge: rewriteData ? `${rewriteData.metrics.afterAtsScore}%` : null
    },
    { id: 'letters' as ActiveTab, label: 'Cover letters', icon: Mail, badge: null },
    { id: 'humanizer' as ActiveTab, label: 'Humanizer', icon: PenLine, badge: null }
  ];

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-60 bg-surface border-r border-line flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 flex items-center justify-between border-b border-line">
          <span className="font-serif text-[19px] font-semibold tracking-tight text-ink">Career Guide</span>
          <button onClick={onClose} className="btn btn-ghost btn-sm !px-1.5 lg:hidden" aria-label="Close menu">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Tools">
          <ul className="space-y-0.5">
            {navItems.map(({ id, label, icon: Icon, badge }) => {
              const isActive = activeTab === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => {
                      onSelectTab(id);
                      onClose();
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full h-9 px-3 rounded-md flex items-center gap-3 text-[13.5px] transition-colors ${
                      isActive
                        ? 'bg-accent-soft text-ink font-medium'
                        : 'text-muted hover:bg-sunken hover:text-ink'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : ''}`} />
                    <span className="flex-1 text-left">{label}</span>
                    {badge && <span className="text-xs tabular-nums text-muted">{badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 pt-4 border-t border-line space-y-0.5">
            <button
              onClick={() => {
                onOpenXYZModal();
                onClose();
              }}
              className="w-full h-9 px-3 rounded-md flex items-center gap-3 text-[13.5px] text-muted hover:bg-sunken hover:text-ink transition-colors"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              How scoring works
            </button>
            <button
              onClick={() => {
                onLoadSampleData();
                onClose();
              }}
              className="w-full h-9 px-3 rounded-md flex items-center gap-3 text-[13.5px] text-muted hover:bg-sunken hover:text-ink transition-colors"
            >
              <FileText className="w-4 h-4 shrink-0" />
              Load example resume
            </button>
          </div>
        </nav>

        <div className="border-t border-line p-3 space-y-3">
          {currentUser ? (
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-8 h-8 rounded-full bg-sunken border border-line text-[11px] font-semibold text-muted flex items-center justify-center shrink-0">
                {currentUser.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{currentUser.name}</p>
                <p className="text-xs text-subtle truncate">{currentUser.email}</p>
              </div>
              <button
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="btn btn-ghost btn-sm !px-1.5"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenLogin();
                onClose();
              }}
              className="btn btn-secondary w-full"
            >
              <LogIn className="w-4 h-4" /> Sign in
            </button>
          )}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-subtle">Theme</span>
            <ThemeSwitcher themeMode={themeMode} onThemeChange={onThemeChange} />
          </div>
        </div>
      </aside>
    </>
  );
};
