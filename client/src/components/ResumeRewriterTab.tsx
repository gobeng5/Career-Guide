import { useState } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  ArrowRight,
  FileCheck,
  CheckCircle2,
  TrendingUp,
  FileText
} from 'lucide-react';

interface BulletDiff {
  original: string;
  rewritten: string;
  scoreBefore: number;
  scoreAfter: number;
}

interface RewriteResult {
  targetRole: string;
  tailoredSummary: string;
  rewrittenMarkdown: string;
  bulletsDiff: BulletDiff[];
  keywordsInjected: string[];
  metrics: {
    beforeAtsScore: number;
    afterAtsScore: number;
    xyzAdherenceScore: number;
    totalBulletsRewritten: number;
  };
}

interface ResumeRewriterTabProps {
  rewriteData: RewriteResult | null;
  isLoading: boolean;
  onRewrite: () => void;
  hasResume: boolean;
  hasJobDescription: boolean;
}

export const ResumeRewriterTab = ({
  rewriteData,
  isLoading,
  onRewrite,
  hasResume,
  hasJobDescription
}: ResumeRewriterTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'diff' | 'full'>('diff');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopy = () => {
    if (!rewriteData) return;
    navigator.clipboard.writeText(rewriteData.rewrittenMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    if (!rewriteData) return;
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Tailored Resume - ${rewriteData.targetRole}`,
          content: rewriteData.rewrittenMarkdown,
          filename: `Resume_${rewriteData.targetRole.replace(/\s+/g, '_')}_XYZ.docx`
        })
      });

      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tailored_Resume_${rewriteData.targetRole.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Error downloading docx:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!rewriteData) return;
    const blob = new Blob([rewriteData.rewrittenMarkdown], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tailored_Resume_${rewriteData.targetRole.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!rewriteData && !isLoading) {
    return (
      <div className="glass-card rounded-3xl p-14 text-center flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600/20 via-sky-500/20 to-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 ring-1 ring-white/10 shadow-2xl">
          <FileCheck className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
          Rewrite Resume for Target Job Match
        </h3>
        <p className="text-sm text-slate-300 max-w-lg mb-8 leading-relaxed">
          Align your resume directly to the target job description. We convert weak bullets into strict Google XYZ accomplishments, naturally weave in target ATS keywords, and supercharge your ranking.
        </p>
        <button
          onClick={onRewrite}
          disabled={!hasResume}
          className={`px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center gap-2.5 shadow-xl ${
            hasResume
              ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/30 hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Rewrite Resume (XYZ & Job Match)
        </button>
        {!hasJobDescription && (
          <p className="text-xs text-amber-300 mt-4 font-medium bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/30">
            Tip: Pasting a target job description above yields hyper-targeted ATS keyword matching.
          </p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl p-16 text-center flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 border-r-teal-500 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">Tailoring Resume to Target Job...</h3>
        <p className="text-xs text-slate-400">Transforming accomplishments into Google XYZ format and injecting ATS keywords</p>
      </div>
    );
  }

  if (!rewriteData) return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Score Jump & Key Injected Stats */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Target Role: {rewriteData.targetRole}
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              Resume Tailored & Optimized
            </h3>
            <p className="text-xs text-slate-300 mt-1.5">
              {rewriteData.metrics.totalBulletsRewritten} accomplishments reformulated into Google's Accomplished [X], Measured by [Y], by doing [Z] standard.
            </p>
          </div>

          {/* ATS Improvement Gauge */}
          <div className="flex items-center gap-5 bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Before</span>
              <div className="text-2xl font-extrabold text-slate-400">
                {rewriteData.metrics.beforeAtsScore}%
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">New ATS Match</span>
              <div className="text-3xl font-black text-emerald-400 flex items-center justify-center gap-1">
                {rewriteData.metrics.afterAtsScore}%
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Injected Target Keywords */}
        {rewriteData.keywordsInjected.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300 mr-1">Injected Target Competencies:</span>
            {rewriteData.keywordsInjected.map((kw, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-sm"
              >
                ✓ {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('diff')}
            className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeSubTab === 'diff'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Before vs After (XYZ Bullets)
          </button>
          <button
            onClick={() => setActiveSubTab('full')}
            className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeSubTab === 'full'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Full Tailored Resume
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Resume
              </>
            )}
          </button>

          <button
            onClick={handleDownloadTxt}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" /> Plain Text (.txt)
          </button>

          <button
            onClick={handleDownloadDocx}
            disabled={isExporting}
            className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Generating Word...' : 'Download Word (.docx)'}
          </button>
        </div>
      </div>

      {/* Tab Content: Diff View vs Full Resume */}
      {activeSubTab === 'diff' ? (
        <div className="space-y-4">
          {rewriteData.bulletsDiff.map((bullet, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl p-5 space-y-3 shadow-md"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Bullet */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-rose-950/60 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold text-rose-400 uppercase tracking-wider">
                      Original Bullet:
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">{bullet.scoreBefore}/100</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    {bullet.original}
                  </p>
                </div>

                {/* Rewritten Bullet */}
                <div className="bg-gradient-to-br from-emerald-950/40 to-slate-950 p-4 rounded-xl border border-emerald-500/40 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Google XYZ Formatted:
                    </span>
                    <span className="text-[11px] text-emerald-400 font-black">{bullet.scoreAfter}/100</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed font-sans">
                    {bullet.rewritten}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl">
          <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed bg-slate-950 p-6 rounded-2xl border border-slate-800 max-h-[600px] overflow-y-auto">
            {rewriteData.rewrittenMarkdown}
          </pre>
        </div>
      )}
    </div>
  );
};
