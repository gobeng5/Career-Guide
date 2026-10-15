import {
  Target,
  FileCheck,
  Mail,
  ShieldCheck,
  BookOpen,
  Sparkles,
  X,
  Zap,
  ChevronRight,
  Cpu,
  LogOut,
  UserCheck
} from 'lucide-react';
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
      label: 'Google XYZ Scorer',
      subtitle: 'Analyze accomplishments & metrics',
      icon: Target,
      badge: scoreData ? `${scoreData.overallScore}/100` : null,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    },
    {
      id: 'rewriter' as ActiveTab,
      label: 'Resume Rewriter',
      subtitle: 'Job match & ATS keyword tailor',
      icon: FileCheck,
      badge: rewriteData ? `${rewriteData.metrics.afterAtsScore}% ATS` : null,
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
    },
    {
      id: 'letters' as ActiveTab,
      label: 'Cover & Application Letters',
      subtitle: 'Dual narrative & formal letters',
      icon: Mail,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'humanizer' as ActiveTab,
      label: 'AI Humanizer',
      subtitle: 'Bypass detectors & naturalize text',
      icon: ShieldCheck,
      badge: 'Stealth',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    }
  ];

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md transition-opacity"
        />
      )}

      {/* Sidebar Panel in White & Blue */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 bg-slate-950/95 border-r border-blue-900/40 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out backdrop-blur-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 border-b border-blue-900/30 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 ring-1 ring-white/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white">CareerCraft</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-blue-300/80 font-medium">Google XYZ Resume Suite</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition cursor-pointer"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account Card */}
        <div className="p-4 border-b border-blue-900/30">
          {currentUser ? (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-blue-900/40 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-600 text-white font-extrabold text-sm flex items-center justify-center ring-1 ring-white/20 shadow-md">
                  {currentUser.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 m-0">
                    {currentUser.name}
                  </h4>
                  <span className="text-[10px] font-semibold text-sky-400 block mt-0.5">
                    ● {currentUser.role}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl border border-transparent hover:border-rose-900/40 transition cursor-pointer"
                title="Sign Out"
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
              className="w-full p-3 rounded-2xl bg-blue-950/40 hover:bg-blue-900/40 border border-blue-500/30 text-blue-300 flex items-center justify-between transition cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">Sign In / Register</span>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-400" />
            </button>
          )}
        </div>

        {/* DeepSeek Status Card */}
        <div className="p-4 border-b border-blue-900/30">
          <div className="w-full p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950/50 border border-blue-900/50 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> AI Engine
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-sky-400 bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                DeepSeek AI
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Backend Integrated & Ready
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3.5 py-4 space-y-2 overflow-y-auto">
          <p className="px-3 text-[10px] font-black uppercase tracking-widest text-blue-300/80 mb-2">
            Navigation Menu
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-600 text-white shadow-xl shadow-blue-600/30 font-bold ring-1 ring-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-blue-950/40 border border-transparent hover:border-blue-900/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-900 text-blue-400 group-hover:text-blue-300 group-hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">{item.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 leading-tight ${
                        isActive ? 'text-blue-100 font-normal' : 'text-slate-400 font-normal'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Utility Actions */}
        <div className="p-3.5 border-t border-blue-900/30 space-y-2 bg-slate-950/80">
          {/* Theme switcher row */}
          <div className="px-1 py-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Theme</span>
            <ThemeSwitcher themeMode={themeMode} onThemeChange={onThemeChange} />
          </div>

          <button
            onClick={() => {
              onOpenXYZModal();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-900 transition cursor-pointer font-medium"
          >
            <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Google XYZ Formula Guide</span>
          </button>

          <button
            onClick={() => {
              onLoadSampleData();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-sky-300 hover:text-sky-200 hover:bg-blue-950/40 transition cursor-pointer font-medium"
          >
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Load Sample Profile</span>
          </button>
        </div>
      </aside>
    </>
  );
};
