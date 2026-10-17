import { useState, useEffect } from 'react';
import { Menu, ChevronDown, ChevronUp, RotateCcw, FileText, Loader2 } from 'lucide-react';

import { FileUploadBox } from './components/FileUploadBox';
import { ResumeScorerTab } from './components/ResumeScorerTab';
import { ResumeRewriterTab } from './components/ResumeRewriterTab';
import { LettersTab } from './components/LettersTab';
import { HumanizerTab } from './components/HumanizerTab';
import { XYZModal } from './components/XYZModal';
import { Sidebar, type ActiveTab } from './components/Sidebar';
import { LoginPage, type AuthUser } from './components/LoginPage';
import { type ThemeMode } from './components/ThemeSwitcher';

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

  const tabMeta: Record<ActiveTab, { title: string; subtitle: string }> = {
    scorer: {
      title: 'Resume score',
      subtitle: 'See how clearly each bullet states what you achieved, how it was measured, and how you did it.'
    },
    rewriter: {
      title: 'Tailor resume',
      subtitle: 'Rewrite your resume for a specific job, with stronger bullets and the posting’s keywords worked in.'
    },
    letters: {
      title: 'Cover letters',
      subtitle: 'Write a cover letter and a formal application letter from your resume and the job posting.'
    },
    humanizer: {
      title: 'Humanizer',
      subtitle: 'Rewrite stiff, AI-sounding text so it reads the way a person writes.'
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

  const meta = tabMeta[activeTab];
  const hasResume = !!resumeText.trim();
  const resumeWords = resumeText.split(/\s+/).filter(Boolean).length;

  // The one action the input panel offers depends on the current tool
  const primaryAction =
    activeTab === 'scorer'
      ? { label: 'Score resume', busyLabel: 'Scoring', onClick: handleScoreResume, busy: isScoringLoading }
      : activeTab === 'rewriter'
      ? { label: 'Tailor resume', busyLabel: 'Tailoring', onClick: handleRewriteResume, busy: isRewritingLoading }
      : null;

  return (
    <div className="min-h-screen lg:pl-60">
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

      {/* Mobile top bar; the sidebar is always visible from lg up */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center gap-3 bg-surface border-b border-line">
        <button onClick={() => setIsSidebarOpen(true)} className="btn btn-ghost btn-sm !px-1.5" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-serif text-[18px] font-semibold tracking-tight text-ink">Career Guide</span>
      </header>

      <main className="max-w-[1080px] mx-auto px-4 sm:px-8 py-8 lg:py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{meta.title}</h1>
            <p className="text-[14px] text-muted mt-1 max-w-[62ch]">{meta.subtitle}</p>
          </div>
          {activeTab !== 'humanizer' && (
            <div className="flex items-center gap-2 shrink-0">
              {(resumeText || jobDescriptionText) && (
                <button onClick={handleReset} className="btn btn-ghost btn-sm">
                  <RotateCcw className="w-3.5 h-3.5" /> Start over
                </button>
              )}
              <button onClick={handleLoadSampleData} className="btn btn-secondary btn-sm">
                <FileText className="w-3.5 h-3.5" /> Load example
              </button>
            </div>
          )}
        </div>

        {activeTab !== 'humanizer' && (
          <section className="panel" aria-label="Your documents">
            <div className="flex items-center justify-between px-5 sm:px-6 h-12 border-b border-line">
              <h2 className="text-[13.5px] font-medium text-ink">Your documents</h2>
              <button
                onClick={() => setIsInputsCollapsed(!isInputsCollapsed)}
                className="btn btn-ghost btn-sm"
                aria-expanded={!isInputsCollapsed}
              >
                {isInputsCollapsed ? (
                  <>
                    Show <ChevronDown className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Hide <ChevronUp className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {!isInputsCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 sm:p-6">
                <FileUploadBox
                  label="Resume"
                  value={resumeText}
                  onChange={setResumeText}
                  placeholder="Paste your resume, or upload a file."
                  minHeight="min-h-[180px]"
                />
                <FileUploadBox
                  label="Job posting"
                  sublabel="Optional, but needed for keyword matching"
                  value={jobDescriptionText}
                  onChange={setJobDescriptionText}
                  placeholder="Paste the job description you’re applying for."
                  minHeight="min-h-[180px]"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-line bg-sunken rounded-b-lg">
              <p className="text-[13px] text-muted">
                {hasResume ? `Resume added, ${resumeWords.toLocaleString()} words` : 'Add your resume to get started.'}
              </p>
              {primaryAction ? (
                <button
                  onClick={primaryAction.onClick}
                  disabled={!hasResume || primaryAction.busy}
                  className="btn btn-primary"
                >
                  {primaryAction.busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {primaryAction.busy ? primaryAction.busyLabel : primaryAction.label}
                </button>
              ) : (
                <p className="text-[13px] text-subtle">Set the letter details below.</p>
              )}
            </div>
          </section>
        )}

        {activeTab === 'scorer' && <ResumeScorerTab scoreData={scoreData} isLoading={isScoringLoading} />}

        {activeTab === 'rewriter' && (
          <ResumeRewriterTab
            rewriteData={rewriteData}
            isLoading={isRewritingLoading}
            hasJobDescription={!!jobDescriptionText.trim()}
          />
        )}

        {activeTab === 'letters' && (
          <LettersTab
            lettersData={lettersData}
            isLoading={isLettersLoading}
            onGenerate={handleGenerateLetters}
            hasResume={hasResume}
          />
        )}

        {activeTab === 'humanizer' && <HumanizerTab />}
      </main>
    </div>
  );
}

export default App;
