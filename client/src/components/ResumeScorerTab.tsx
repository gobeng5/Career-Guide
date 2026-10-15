import { useState } from 'react';
import {
  Award,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  Target,
  Sparkles,
  Zap,
  ArrowUpRight
} from 'lucide-react';

interface BulletComponent {
  x: { present: boolean; strength: string; verb: string };
  y: { present: boolean; metrics: string[] };
  z: { present: boolean; method: string | null; tools: string[] };
}

interface BulletAnalysis {
  original: string;
  score: number;
  grade: string;
  components: BulletComponent;
  missing: string[];
  rewrite: string;
}

interface ScoreResult {
  overallScore: number;
  letterGrade: string;
  matchScore: number;
  breakdown: {
    avgBulletScore: number;
    xyzComplianceRate: number;
    quantifiableImpactScore: number;
    verbStrengthScore: number;
    methodSpecificityScore: number;
  };
  totalBullets: number;
  compliantBullets: number;
  bullets: BulletAnalysis[];
  keywords: {
    matched: string[];
    missing: string[];
  };
  strengths: string[];
  weaknesses: string[];
}

interface ResumeScorerTabProps {
  scoreData: ScoreResult | null;
  isLoading: boolean;
  onAnalyze: () => void;
  hasResume: boolean;
}

export const ResumeScorerTab = ({
  scoreData,
  isLoading,
  onAnalyze,
  hasResume
}: ResumeScorerTabProps) => {
  const [filter, setFilter] = useState<'all' | 'needs_rewrite' | 'high_impact'>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!scoreData && !isLoading) {
    return (
      <div className="glass-card rounded-3xl p-14 text-center flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600/20 via-blue-500/20 to-sky-400/20 text-blue-400 flex items-center justify-center mb-5 ring-1 ring-white/10 shadow-2xl">
          <Target className="w-10 h-10 text-blue-400" />
        </div>
        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
          Ready to Score with Google's XYZ Formula
        </h3>
        <p className="text-sm text-slate-300 max-w-lg mb-8 leading-relaxed">
          Evaluate how effectively your bullet points communicate <span className="text-emerald-400 font-semibold">Accomplished [X]</span>, <span className="text-amber-400 font-semibold">Measured by [Y]</span>, and <span className="text-sky-400 font-semibold">By doing [Z]</span>.
        </p>
        <button
          onClick={onAnalyze}
          disabled={!hasResume}
          className={`px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center gap-2.5 shadow-xl ${
            hasResume
              ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-blue-500/30 hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Calculate Google XYZ Score
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl p-16 text-center flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-sky-400 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">Analyzing Accomplishments with DeepSeek...</h3>
        <p className="text-xs text-slate-400">Extracting action verbs [X], measuring metrics [Y], and evaluating methodology [Z]</p>
      </div>
    );
  }

  if (!scoreData) return null;

  const filteredBullets = scoreData.bullets.filter(b => {
    if (filter === 'needs_rewrite') return b.score < 70;
    if (filter === 'high_impact') return b.score >= 85;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Main Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Donut Scorecard */}
        <div className="lg:col-span-4 glass-card rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

          <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-300 mb-2">
            Overall Google XYZ Score
          </span>

          <div className="relative my-3 flex items-center justify-center">
            {/* Circular progress container */}
            <div className="w-36 h-36 rounded-full bg-slate-950/80 border-4 border-blue-500/30 flex flex-col items-center justify-center shadow-inner relative ring-4 ring-blue-500/10">
              <span className="text-5xl font-black text-white tracking-tight">
                {scoreData.overallScore}
              </span>
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                out of 100
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-blue-500/20 to-sky-500/20 text-blue-200 border border-blue-500/40 shadow-sm mt-2">
            <Award className="w-4 h-4 text-amber-400" /> Grade: {scoreData.letterGrade}
          </div>

          <p className="text-xs text-slate-300 mt-3 font-medium">
            <span className="text-emerald-400 font-bold">{scoreData.compliantBullets}</span> of {scoreData.totalBullets} bullets strictly comply with the XYZ formula
          </p>
        </div>

        {/* 3 Metric Scorecards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Action Verbs Card */}
          <div className="glass-card rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden border-t-2 border-t-emerald-400/60">
            <div className="flex items-center justify-between text-emerald-400 mb-3">
              <span className="text-xs font-bold text-slate-200">[X] Action Verbs</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-white mb-1.5">
                {scoreData.breakdown.verbStrengthScore}%
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${scoreData.breakdown.verbStrengthScore}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-medium leading-relaxed">
              Spearheaded, Engineered & authoritative active verbs
            </p>
          </div>

          {/* Metrics Card */}
          <div className="glass-card rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden border-t-2 border-t-amber-400/60">
            <div className="flex items-center justify-between text-amber-400 mb-3">
              <span className="text-xs font-bold text-slate-200">[Y] Metrics & Data</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-white mb-1.5">
                {scoreData.breakdown.quantifiableImpactScore}%
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${scoreData.breakdown.quantifiableImpactScore}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-medium leading-relaxed">
              %, $, user scale, revenue, and latency reductions
            </p>
          </div>

          {/* Method Card */}
          <div className="glass-card rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden border-t-2 border-t-sky-400/60">
            <div className="flex items-center justify-between text-sky-400 mb-3">
              <span className="text-xs font-bold text-slate-200">[Z] Method & Tools</span>
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-white mb-1.5">
                {scoreData.breakdown.methodSpecificityScore}%
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${scoreData.breakdown.methodSpecificityScore}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-medium leading-relaxed">
              Explicit frameworks, architectures & technical systems
            </p>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses / ATS Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Executive Strengths & Weaknesses */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-400" /> Executive Diagnosis
          </h4>
          <div className="space-y-2.5">
            {scoreData.strengths.map((str, i) => (
              <div
                key={i}
                className="flex items-start gap-3 text-xs text-slate-200 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 shadow-sm"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{str}</span>
              </div>
            ))}
            {scoreData.weaknesses.map((weak, i) => (
              <div
                key={i}
                className="flex items-start gap-3 text-xs text-slate-200 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 shadow-sm"
              >
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{weak}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ATS Keywords Alignment */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" /> Target Job Alignment
              </h4>
              <span className="text-xs font-black text-blue-200 bg-gradient-to-r from-blue-500/20 to-sky-500/20 px-3 py-1 rounded-full border border-blue-500/40">
                {scoreData.matchScore}% Match
              </span>
            </div>

            {scoreData.keywords.matched.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  Matched Target Skills:
                </p>
                <div className="flex flex-wrap gap-2">
                  {scoreData.keywords.matched.slice(0, 14).map((kw, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    >
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {scoreData.keywords.missing.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-2">
                  Missing High-Value Keywords:
                </p>
                <div className="flex flex-wrap gap-2">
                  {scoreData.keywords.missing.slice(0, 12).map((kw, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-950/50 text-rose-300 border border-rose-500/40 shadow-sm"
                    >
                      + {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bullet-by-Bullet Breakdown */}
      <div className="glass-card rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" /> Bullet-by-Bullet Google XYZ Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Every accomplishment evaluated with immediate rewritten Google XYZ alternatives
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({scoreData.bullets.length})
            </button>
            <button
              onClick={() => setFilter('needs_rewrite')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                filter === 'needs_rewrite'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Needs Work
            </button>
            <button
              onClick={() => setFilter('high_impact')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                filter === 'high_impact'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Strong XYZ
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredBullets.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No bullet points match this filter.</p>
          ) : (
            filteredBullets.map((bullet, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-md"
              >
                {/* Header row: Original bullet + score */}
                <div className="flex items-start justify-between gap-4 mb-3.5">
                  <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed flex-1">
                    "{bullet.original}"
                  </p>
                  <div
                    className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 border shadow-sm ${
                      bullet.score >= 85
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50'
                        : bullet.score >= 60
                        ? 'bg-amber-950/60 text-amber-400 border-amber-500/50'
                        : 'bg-rose-950/60 text-rose-400 border-rose-500/50'
                    }`}
                  >
                    {bullet.score}/100 &bull; {bullet.grade}
                  </div>
                </div>

                {/* XYZ Components Pill Row */}
                <div className="flex flex-wrap items-center gap-2 mb-3.5">
                  {/* [X] Pill */}
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border shadow-sm ${
                      bullet.components.x.present && bullet.components.x.strength === 'strong'
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                        : bullet.components.x.present
                        ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                        : 'bg-rose-950/70 text-rose-400 border-rose-500/40'
                    }`}
                  >
                    X (Action): {bullet.components.x.present ? `"${bullet.components.x.verb}"` : 'Missing'}
                  </span>

                  {/* [Y] Pill */}
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border shadow-sm ${
                      bullet.components.y.present
                        ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                        : 'bg-rose-950/70 text-rose-400 border-rose-500/40'
                    }`}
                  >
                    Y (Metric): {bullet.components.y.present ? bullet.components.y.metrics.join(', ') : 'No Quantifiable Data'}
                  </span>

                  {/* [Z] Pill */}
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border shadow-sm ${
                      bullet.components.z.present
                        ? 'bg-sky-950/70 text-sky-300 border-sky-500/40'
                        : 'bg-rose-950/70 text-rose-400 border-rose-500/40'
                    }`}
                  >
                    Z (Method/Tools): {bullet.components.z.present ? (bullet.components.z.method || 'Tools present') : 'Missing Execution Method'}
                  </span>
                </div>

                {/* Instant Google XYZ Rewrite */}
                {bullet.rewrite && (
                  <div className="mt-3.5 bg-gradient-to-r from-blue-950/50 to-slate-900/60 border border-blue-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div>
                      <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> Google XYZ Rewritten Recommendation:
                      </span>
                      <p className="text-xs text-blue-100 font-medium leading-relaxed">
                        {bullet.rewrite}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(bullet.rewrite, idx)}
                      className="text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 shrink-0 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto active:scale-95"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Rewrite
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
