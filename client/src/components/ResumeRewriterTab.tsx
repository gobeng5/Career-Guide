import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { DocumentView } from './DocumentView';
import { EmptyState, LoadingState } from './States';

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
  hasJobDescription: boolean;
}

export const ResumeRewriterTab = ({ rewriteData, isLoading, hasJobDescription }: ResumeRewriterTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'full' | 'diff'>('full');
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

  if (isLoading) {
    return <LoadingState title="Tailoring your resume" detail="Rewriting bullets and matching the job posting." />;
  }

  if (!rewriteData) {
    return (
      <EmptyState title="No tailored resume yet">
        Add your resume above and select Tailor resume.
        {!hasJobDescription && ' Add the job posting first to get a version matched to that role.'}
      </EmptyState>
    );
  }

  const { metrics } = rewriteData;

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <p className="text-[13px] text-muted">Tailored for</p>
            <h2 className="text-lg font-semibold text-ink mt-0.5">{rewriteData.targetRole}</h2>
            <p className="text-[13.5px] text-muted mt-1.5">
              {metrics.totalBulletsRewritten} bullets rewritten to state the result, the number and the method.
            </p>
          </div>
          <dl className="flex gap-8 shrink-0">
            <div>
              <dt className="text-[13px] text-muted">Keyword match before</dt>
              <dd className="text-2xl font-semibold tabular-nums text-subtle mt-0.5">{metrics.beforeAtsScore}%</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">After</dt>
              <dd className="text-2xl font-semibold tabular-nums text-good mt-0.5">{metrics.afterAtsScore}%</dd>
            </div>
          </dl>
        </div>

        {rewriteData.keywordsInjected.length > 0 && (
          <div className="mt-5 pt-5 border-t border-line">
            <h3 className="text-[13px] font-medium text-ink mb-2">Keywords added</h3>
            <div className="flex flex-wrap gap-1.5">
              {rewriteData.keywordsInjected.map((kw, i) => (
                <span key={i} className="chip chip-neutral">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="segmented" role="group" aria-label="View">
          <button aria-pressed={activeSubTab === 'full'} onClick={() => setActiveSubTab('full')}>
            Tailored resume
          </button>
          <button aria-pressed={activeSubTab === 'diff'} onClick={() => setActiveSubTab('diff')}>
            What changed
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleCopy} className="btn btn-ghost btn-sm">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
          <button onClick={handleDownloadTxt} className="btn btn-secondary btn-sm">
            Download .txt
          </button>
          <button onClick={handleDownloadDocx} disabled={isExporting} className="btn btn-primary btn-sm">
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Preparing file' : 'Download Word'}
          </button>
        </div>
      </div>

      {activeSubTab === 'full' ? (
        <DocumentView text={rewriteData.rewrittenMarkdown} />
      ) : (
        <section className="panel divide-y divide-line">
          <div className="hidden md:grid grid-cols-2 gap-6 px-6 py-3 text-[13px] font-medium text-muted">
            <span>Before</span>
            <span>After</span>
          </div>
          {rewriteData.bulletsDiff.map((bullet, idx) => (
            <div key={idx} className="grid md:grid-cols-2 gap-3 md:gap-6 px-6 py-5">
              <div>
                <p className="md:hidden text-xs font-medium text-muted mb-1">Before</p>
                <p className="text-[13.5px] text-muted leading-relaxed">{bullet.original}</p>
                <p className="text-xs text-subtle mt-1.5 tabular-nums">Score {bullet.scoreBefore}</p>
              </div>
              <div>
                <p className="md:hidden text-xs font-medium text-muted mb-1">After</p>
                <p className="text-[13.5px] text-ink leading-relaxed">{bullet.rewritten}</p>
                <p className="text-xs text-good mt-1.5 tabular-nums">Score {bullet.scoreAfter}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
