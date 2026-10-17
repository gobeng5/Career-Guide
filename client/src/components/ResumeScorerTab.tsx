import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { EmptyState, LoadingState, scoreTone } from './States';

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
}

const Meter = ({ label, value, hint }: { label: string; value: number; hint: string }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13.5px] font-medium text-ink">{label}</span>
      <span className="text-[13.5px] tabular-nums text-ink">{value}%</span>
    </div>
    <div className="mt-2 h-1.5 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
    <p className="text-xs text-muted mt-1.5">{hint}</p>
  </div>
);

export const ResumeScorerTab = ({ scoreData, isLoading }: ResumeScorerTabProps) => {
  const [filter, setFilter] = useState<'all' | 'needs_rewrite' | 'high_impact'>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isLoading) {
    return <LoadingState title="Scoring your resume" detail="Checking each bullet for a result, a number and a method." />;
  }

  if (!scoreData) {
    return (
      <EmptyState title="No score yet">
        Add your resume above and select Score resume. Add a job posting too if you want to see which of its keywords
        you’re missing.
      </EmptyState>
    );
  }

  const filteredBullets = scoreData.bullets.filter((b) => {
    if (filter === 'needs_rewrite') return b.score < 70;
    if (filter === 'high_impact') return b.score >= 85;
    return true;
  });

  const tone = scoreTone(scoreData.overallScore);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="panel grid md:grid-cols-[240px_1fr]">
        <div className="p-6 border-b md:border-b-0 md:border-r border-line">
          <p className="text-[13px] text-muted">Overall score</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="font-serif text-[56px] leading-none font-semibold tabular-nums text-ink">
              {scoreData.overallScore}
            </span>
            <span className="text-[15px] text-subtle">/ 100</span>
          </p>
          <span className={`chip chip-${tone} mt-3`}>Grade {scoreData.letterGrade}</span>
          <p className="text-[13px] text-muted mt-4 leading-relaxed">
            {scoreData.compliantBullets} of {scoreData.totalBullets} bullets follow the full formula.
          </p>
        </div>
        <div className="p-6 grid sm:grid-cols-3 gap-6 content-center">
          <Meter
            label="Results"
            value={scoreData.breakdown.verbStrengthScore}
            hint="Bullets that lead with a strong verb and an outcome."
          />
          <Meter
            label="Numbers"
            value={scoreData.breakdown.quantifiableImpactScore}
            hint="Bullets that back the result with a figure."
          />
          <Meter
            label="Methods"
            value={scoreData.breakdown.methodSpecificityScore}
            hint="Bullets that say how the work was done."
          />
        </div>
      </section>

      {/* Diagnosis and keywords */}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="panel p-6">
          <h2 className="text-[15px] font-semibold text-ink">Summary</h2>
          {scoreData.strengths.length > 0 && (
            <>
              <h3 className="text-[13px] font-medium text-good mt-4 mb-2">Working well</h3>
              <ul className="space-y-2 text-[13.5px] text-ink list-disc pl-5 marker:text-subtle">
                {scoreData.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {scoreData.weaknesses.length > 0 && (
            <>
              <h3 className="text-[13px] font-medium text-warn mt-5 mb-2">To improve</h3>
              <ul className="space-y-2 text-[13.5px] text-ink list-disc pl-5 marker:text-subtle">
                {scoreData.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">Job match</h2>
            <span className="text-[15px] font-semibold tabular-nums text-ink">{scoreData.matchScore}%</span>
          </div>
          {scoreData.keywords.matched.length === 0 && scoreData.keywords.missing.length === 0 ? (
            <p className="text-[13.5px] text-muted mt-3">Add a job posting to compare your resume against it.</p>
          ) : (
            <>
              {scoreData.keywords.missing.length > 0 && (
                <>
                  <h3 className="text-[13px] font-medium text-ink mt-4 mb-2">Missing from your resume</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {scoreData.keywords.missing.slice(0, 12).map((kw, i) => (
                      <span key={i} className="chip chip-bad">
                        {kw}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {scoreData.keywords.matched.length > 0 && (
                <>
                  <h3 className="text-[13px] font-medium text-ink mt-5 mb-2">Already covered</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {scoreData.keywords.matched.slice(0, 14).map((kw, i) => (
                      <span key={i} className="chip chip-neutral">
                        {kw}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {/* Bullet by bullet */}
      <section className="panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-line">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Bullet by bullet</h2>
            <p className="text-[13px] text-muted mt-0.5">Each bullet with its score and a suggested rewrite.</p>
          </div>
          <div className="segmented" role="group" aria-label="Filter bullets">
            <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              All {scoreData.bullets.length}
            </button>
            <button aria-pressed={filter === 'needs_rewrite'} onClick={() => setFilter('needs_rewrite')}>
              Needs work
            </button>
            <button aria-pressed={filter === 'high_impact'} onClick={() => setFilter('high_impact')}>
              Strong
            </button>
          </div>
        </div>

        {filteredBullets.length === 0 ? (
          <p className="text-[13.5px] text-muted text-center py-10">No bullets match this filter.</p>
        ) : (
          <ol className="divide-y divide-line">
            {filteredBullets.map((bullet, idx) => {
              const c = bullet.components;
              const parts = [
                {
                  key: 'X',
                  ok: c.x.present && c.x.strength === 'strong',
                  partial: c.x.present,
                  text: c.x.present ? `“${c.x.verb}”` : 'No strong action verb'
                },
                {
                  key: 'Y',
                  ok: c.y.present,
                  partial: false,
                  text: c.y.present ? c.y.metrics.join(', ') : 'No number'
                },
                {
                  key: 'Z',
                  ok: c.z.present,
                  partial: false,
                  text: c.z.present ? c.z.method || 'Tools named' : 'No method'
                }
              ];

              return (
                <li key={idx} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[14px] text-ink leading-relaxed">{bullet.original}</p>
                    <span className={`chip chip-${scoreTone(bullet.score)} tabular-nums shrink-0`}>
                      {bullet.score}
                    </span>
                  </div>

                  <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {parts.map((p) => (
                      <li key={p.key} className={p.ok ? 'text-good' : p.partial ? 'text-warn' : 'text-bad'}>
                        <span className="font-semibold">{p.key}</span> <span className="text-muted">{p.text}</span>
                      </li>
                    ))}
                  </ul>

                  {bullet.rewrite && (
                    <div className="mt-3.5 rounded-md bg-sunken border border-line p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted mb-1">Suggested rewrite</p>
                        <p className="text-[13.5px] text-ink leading-relaxed">{bullet.rewrite}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(bullet.rewrite, idx)}
                        className="btn btn-secondary btn-sm shrink-0 self-start"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
};
