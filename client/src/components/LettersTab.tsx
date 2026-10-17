import { useState } from 'react';
import { Download, Copy, Check, Loader2 } from 'lucide-react';
import { DocumentView } from './DocumentView';
import { EmptyState, LoadingState } from './States';

interface LettersResult {
  meta: {
    applicantName: string;
    companyName: string;
    jobTitle: string;
    tone: string;
    extractedSkills: string[];
  };
  coverLetter: string;
  applicationLetter: string;
}

interface LettersTabProps {
  lettersData: LettersResult | null;
  isLoading: boolean;
  onGenerate: (options: any) => void;
  hasResume: boolean;
}

export const LettersTab = ({ lettersData, isLoading, onGenerate, hasResume }: LettersTabProps) => {
  const [activeType, setActiveType] = useState<'cover' | 'application'>('cover');
  const [tone, setTone] = useState<'confident' | 'tech' | 'executive' | 'formal'>('confident');
  const [applicantName, setApplicantName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeContent = activeType === 'cover' ? lettersData?.coverLetter : lettersData?.applicationLetter;
  const activeTitle = activeType === 'cover' ? 'Cover Letter' : 'Formal Application Letter';

  const handleGenerate = () => {
    onGenerate({
      tone,
      applicantName: applicantName.trim() || undefined,
      companyName: companyName.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined
    });
  };

  const handleCopy = () => {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    if (!activeContent) return;
    setIsExporting(true);
    try {
      const fileName = `${activeTitle.replace(/\s+/g, '_')}_${(companyName || 'Application').replace(/\s+/g, '_')}.docx`;
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeTitle,
          content: activeContent,
          filename: fileName
        })
      });

      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
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
    if (!activeContent) return;
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTitle.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-[15px] font-semibold text-ink">Letter details</h2>
          <p className="text-[13px] text-muted mt-0.5">
            All optional. Anything left blank is taken from your resume and the job posting.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
          <div>
            <label htmlFor="tone" className="label">
              Tone
            </label>
            <select id="tone" value={tone} onChange={(e: any) => setTone(e.target.value)} className="field">
              <option value="confident">Confident</option>
              <option value="tech">Technical</option>
              <option value="executive">Executive</option>
              <option value="formal">Formal</option>
            </select>
          </div>
          <div>
            <label htmlFor="applicant" className="label">
              Your name
            </label>
            <input
              id="applicant"
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="company" className="label">
              Company
            </label>
            <input
              id="company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="jobtitle" className="label">
              Job title
            </label>
            <input
              id="jobtitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="field"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-line bg-sunken rounded-b-lg">
          {!hasResume && <p className="text-[13px] text-muted mr-auto">Add your resume above first.</p>}
          <button onClick={handleGenerate} disabled={!hasResume || isLoading} className="btn btn-primary">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Writing' : lettersData ? 'Rewrite letters' : 'Write letters'}
          </button>
        </div>
      </section>

      {isLoading ? (
        <LoadingState title="Writing your letters" detail="Drawing on your strongest results from the resume." />
      ) : lettersData && activeContent ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="segmented" role="group" aria-label="Letter">
              <button aria-pressed={activeType === 'cover'} onClick={() => setActiveType('cover')}>
                Cover letter
              </button>
              <button aria-pressed={activeType === 'application'} onClick={() => setActiveType('application')}>
                Application letter
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

          <DocumentView text={activeContent} />
        </>
      ) : (
        <EmptyState title="No letters yet">
          Select Write letters to get a cover letter and a formal application letter. You can switch between them and
          download either one.
        </EmptyState>
      )}
    </div>
  );
};
