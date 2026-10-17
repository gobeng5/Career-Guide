import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Menu,
  Target,
  FileCheck,
  Mail,
  ShieldCheck,
  Sparkles,
  BookOpen,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Zap,
  Layers,
  LogOut,
  UserCheck
} from 'lucide-react';

import { FileUploadBox } from './components/FileUploadBox';
import { ResumeScorerTab } from './components/ResumeScorerTab';
import { ResumeRewriterTab } from './components/ResumeRewriterTab';
import { LettersTab } from './components/LettersTab';
import { HumanizerTab } from './components/HumanizerTab';
import { XYZModal } from './components/XYZModal';
import { Sidebar, type ActiveTab } from './components/Sidebar';
import { LoginPage, type AuthUser } from './components/LoginPage';
import { ThemeSwitcher, type ThemeMode } from './components/ThemeSwitcher';

export function App() {
  // Theme Mode State ('dark' | 'light' | 'system')
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('career_craft_theme') as ThemeMode) || 'system';
  });

  // Apply theme class to documentElement
  useEffect(() => {
    localStorage.setItem('career_craft_theme', themeMode);

    const applyTheme = () => {
      const isDark =
        themeMode === 'dark' ||
        (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeMode]);

  // Auth State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('career_craft_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isGuest, setIsGuest] = useState(false);

  // App Navigation & UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('scorer');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [isXYZModalOpen, setIsXYZModalOpen] = useState(false);
  const [isInputsCollapsed, setIsInputsCollapsed] = useState(false);

  // Results State
  const [scoreData, setScoreData] = useState<any | null>(null);
  const [rewriteData, setRewriteData] = useState<any | null>(null);
  const [lettersData, setLettersData] = useState<any | null>(null);

  // Loading States
  const [isScoringLoading, setIsScoringLoading] = useState(false);
  const [isRewritingLoading, setIsRewritingLoading] = useState(false);
  const [isLettersLoading, setIsLettersLoading] = useState(false);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsGuest(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem('career_craft_user');
    setCurrentUser(null);
    setIsGuest(false);
  };

  const handleLoadSampleData = async () => {
    try {
      const res = await fetch('/api/sample-data');
      const data = await res.json();
      setResumeText(data.sampleResume);
      setJobDescriptionText(data.sampleJobDescription);
      setIsInputsCollapsed(false);
    } catch (err) {
      console.error('Error fetching sample data:', err);
    }
  };

  const handleReset = () => {
    setResumeText('');
    setJobDescriptionText('');
    setScoreData(null);
    setRewriteData(null);
    setLettersData(null);
  };

  // 1. Calculate Score
  const handleScoreResume = async () => {
    if (!resumeText.trim()) return;
    setIsScoringLoading(true);
    setActiveTab('scorer');

    try {
      const response = await fetch('/api/score-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeText,
          jobDescriptionText
        })
      });

      if (!response.ok) throw new Error('Scoring failed.');
      const data = await response.json();
      setScoreData(data);

      if (data.overallScore >= 75) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Scoring error:', err);
    } finally {
      setIsScoringLoading(false);
    }
  };

  // 2. Rewrite Resume
  const handleRewriteResume = async () => {
    if (!resumeText.trim()) return;
    setIsRewritingLoading(true);
    setActiveTab('rewriter');

    try {
      const response = await fetch('/api/rewrite-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeText,
          jobDescriptionText
        })
      });

      if (!response.ok) throw new Error('Rewriting failed.');
      const data = await response.json();
      setRewriteData(data);

      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Rewrite error:', err);
    } finally {
      setIsRewritingLoading(false);
    }
  };

  // 3. Generate Letters
  const handleGenerateLetters = async (options: any = {}) => {
    if (!resumeText.trim()) return;
    setIsLettersLoading(true);
    setActiveTab('letters');

    try {
      const response = await fetch('/api/generate-letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeText,
          jobDescriptionText,
          options
        })
      });

      if (!response.ok) throw new Error('Letters generation failed.');
      const data = await response.json();
      setLettersData(data);
    } catch (err) {
      console.error('Letters error:', err);
    } finally {
      setIsLettersLoading(false);
    }
  };

  const getTabMeta = () => {
    switch (activeTab) {
      case 'scorer':
        return {
          title: 'Google XYZ Resume Scorer',
          subtitle: 'Grade accomplishments based on: Accomplished [X] as measured by [Y], by doing [Z]',
          icon: Target
        };
      case 'rewriter':
        return {
          title: 'Resume Rewriter for Job Match',
          subtitle: 'Tailor qualifications, infuse ATS keywords, and reformat bullets to Google XYZ standard',
          icon: FileCheck
        };
      case 'letters':
        return {
          title: 'Cover & Application Letters',
          subtitle: 'Generate both a compelling narrative Cover Letter and a formal Job Application Letter',
          icon: Mail
        };
      case 'humanizer':
        return {
          title: 'Deep AI Humanizer & Detector Bypass',
          subtitle: 'Transform robotic AI text into natural human writing with dynamic burstiness and zero cliches',
          icon: ShieldCheck
        };
    }
  };

  // If user is not logged in and not continuing as guest, display the Login Page
  if (!currentUser && !isGuest) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={() => setIsGuest(true)}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
      />
    );
  }

  const tabMeta = getTabMeta();
  const TabIcon = tabMeta.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative">
      {/* Sidebar Navigation Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenXYZModal={() => setIsXYZModalOpen(true)}
        onLoadSampleData={handleLoadSampleData}
        scoreData={scoreData}
        rewriteData={rewriteData}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenLogin={() => setIsGuest(false)}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
      />

      <XYZModal isOpen={isXYZModalOpen} onClose={() => setIsXYZModalOpen(false)} />

      {/* Top Professional Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-2xl border-b border-slate-800/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Top Left Menu Toggle Icon + Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-blue-500/50 shadow-md transition flex items-center justify-center cursor-pointer group"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 ring-1 ring-white/20">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-white tracking-tight">Career Guide</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-blue-300 bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-800/60">
                    <Layers className="w-3 h-3 text-blue-400" /> {tabMeta.title}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls & User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Switcher Toggle */}
            <ThemeSwitcher themeMode={themeMode} onThemeChange={setThemeMode} />

            {/* DeepSeek Active Status Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DeepSeek AI Active</span>
            </div>

            <button
              onClick={() => setIsXYZModalOpen(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">XYZ Formula</span>
            </button>

            <button
              onClick={handleLoadSampleData}
              className="text-xs font-medium px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Load Sample Data</span>
            </button>

            {(resumeText || jobDescriptionText) && (
              <button
                onClick={handleReset}
                title="Reset all inputs and scores"
                className="text-xs font-medium p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* User Profile Avatar / Sign In Button */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
                <div
                  title={`${currentUser.name} (${currentUser.email})`}
                  className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white font-extrabold text-xs flex items-center justify-center ring-1 ring-white/20 shadow-md cursor-pointer"
                >
                  {currentUser.avatar}
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsGuest(false)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Tab Header Banner */}
      <section className="bg-gradient-to-b from-blue-950/30 via-slate-950/60 to-transparent border-b border-slate-800/60 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-sky-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-2xl shrink-0 mt-0.5 ring-1 ring-white/10">
              <TabIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
                {tabMeta.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 m-0 max-w-2xl leading-relaxed">
                {tabMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Quick tab trigger button to open sidebar */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-blue-300 border border-blue-500/30 hover:border-blue-500/60 flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <Menu className="w-4 h-4" /> Switch Tool / Tab
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Unified Input Section (For Scorer, Rewriter, and Letters tabs) */}
        {activeTab !== 'humanizer' && (
          <div className="glass-card rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black uppercase tracking-widest text-slate-200">
                  Document Workspace (File Upload & Paste Supported)
                </span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">&bull; PDF, Word (.docx), or Text</span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  DeepSeek Active
                </span>
              </div>
              <button
                onClick={() => setIsInputsCollapsed(!isInputsCollapsed)}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition"
              >
                {isInputsCollapsed ? (
                  <>
                    <ChevronDown className="w-4 h-4 text-blue-400" /> Expand Inputs
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4 text-blue-400" /> Minimize Inputs
                  </>
                )}
              </button>
            </div>

            {!isInputsCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
                <FileUploadBox
                  label="Your Resume"
                  sublabel="Upload PDF / DOCX or paste plain resume text"
                  value={resumeText}
                  onChange={setResumeText}
                  placeholder={`Paste your current resume here or upload a file...\n\nExample:\nAlex Rivera - Software Engineer\n- Spearheaded migration of database services to AWS\n- Reduced latency by 35% through Redis caching`}
                  minHeight="min-h-[150px]"
                  accentColor="blue"
                />

                <FileUploadBox
                  label="Target Job Description"
                  sublabel="Upload job listing or paste job requirements"
                  value={jobDescriptionText}
                  onChange={setJobDescriptionText}
                  placeholder={`Paste target job description or requirements here...\n\nExample:\nWe are hiring a Senior Software Engineer with expertise in Node.js, React, distributed systems, and AWS...`}
                  minHeight="min-h-[150px]"
                  accentColor="sky"
                />
              </div>
            )}

            {/* Quick Action Buttons Bar */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-medium">
                {resumeText.trim() ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Resume ready ({resumeText.split(/\s+/).filter(Boolean).length} words)
                  </span>
                ) : (
                  <span className="text-slate-400">Upload or paste a resume to begin</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleScoreResume}
                  disabled={!resumeText.trim() || isScoringLoading}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    resumeText.trim() && !isScoringLoading
                      ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-lg shadow-blue-500/30 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }`}
                >
                  <Target className="w-4 h-4" /> Calculate Google XYZ Score
                </button>

                <button
                  onClick={handleRewriteResume}
                  disabled={!resumeText.trim() || isRewritingLoading}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    resumeText.trim() && !isRewritingLoading
                      ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }`}
                >
                  <FileCheck className="w-4 h-4" /> Rewrite for Job Match
                </button>

                <button
                  onClick={() => handleGenerateLetters()}
                  disabled={!resumeText.trim() || isLettersLoading}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
                    resumeText.trim() && !isLettersLoading
                      ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  }`}
                >
                  <Mail className="w-4 h-4" /> Generate Letters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Specific Content */}
        {activeTab === 'scorer' && (
          <ResumeScorerTab
            scoreData={scoreData}
            isLoading={isScoringLoading}
            onAnalyze={handleScoreResume}
            hasResume={!!resumeText.trim()}
          />
        )}

        {activeTab === 'rewriter' && (
          <ResumeRewriterTab
            rewriteData={rewriteData}
            isLoading={isRewritingLoading}
            onRewrite={handleRewriteResume}
            hasResume={!!resumeText.trim()}
            hasJobDescription={!!jobDescriptionText.trim()}
          />
        )}

        {activeTab === 'letters' && (
          <LettersTab
            lettersData={lettersData}
            isLoading={isLettersLoading}
            onGenerate={handleGenerateLetters}
            hasResume={!!resumeText.trim()}
          />
        )}

        {activeTab === 'humanizer' && <HumanizerTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Career Guide &bull; Google XYZ Resume Suite & Deep AI Humanizer</span>
          <span>Accomplished [X] as measured by [Y], by doing [Z]</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
