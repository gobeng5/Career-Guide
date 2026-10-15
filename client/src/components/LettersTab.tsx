import { useState } from 'react';
import {
  Mail,
  FileText,
  Download,
  Copy,
  Check,
  Sparkles,
  Briefcase,
  Building,
  User
} from 'lucide-react';

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

export const LettersTab = ({
  lettersData,
  isLoading,
  onGenerate,
  hasResume
}: LettersTabProps) => {
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
    <div className="space-y-6 animate-fadeIn">
      {/* Configuration Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 pb-5 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2.5 tracking-tight">
              <Mail className="w-5 h-5 text-blue-400" /> Cover & Application Letter Studio
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Generates both a narrative Cover Letter and a formal HR Application Letter featuring your top Google XYZ accomplishments
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!hasResume || isLoading}
            className={`px-6 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 self-start md:self-auto shadow-xl ${
              hasResume && !isLoading
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-blue-500/25 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {lettersData ? 'Regenerate Letters' : 'Generate Both Letters'}
          </button>
        </div>

        {/* Customization Controls: Tone and Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-200 block mb-1.5 uppercase tracking-wider">
              Letter Tone / Style
            </label>
            <select
              value={tone}
              onChange={(e: any) => setTone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="confident">Confident & Results-Driven</option>
              <option value="tech">Tech & Innovation Focused</option>
              <option value="executive">Executive & Visionary</option>
              <option value="formal">Traditional & Formal</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1.5 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-blue-400" /> Applicant Name
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Rivera"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 placeholder-slate-600 shadow-sm"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1.5 uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-sky-400" /> Target Company
            </label>
            <input
              type="text"
              placeholder="e.g. Google, NovaPay LLC"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 placeholder-slate-600 shadow-sm"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1.5 uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Target Job Title
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 placeholder-slate-600 shadow-sm"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card rounded-3xl p-16 text-center flex flex-col items-center justify-center">
          <div className="relative w-16 h-16 mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-sky-400 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1.5">Crafting Tailored Application Letters...</h3>
          <p className="text-xs text-slate-400">Integrating your validated Google XYZ accomplishments into the narrative</p>
        </div>
      ) : lettersData ? (
        <div className="space-y-4">
          {/* Document Switcher & Export Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveType('cover')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeType === 'cover'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4" /> Cover Letter
              </button>
              <button
                onClick={() => setActiveType('application')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeType === 'application'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" /> Formal Application Letter
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
                    <Copy className="w-3.5 h-3.5" /> Copy Text
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
                className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'Generating Word...' : 'Download Word (.docx)'}
              </button>
            </div>
          </div>

          {/* Letter Presentation Paper Card */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="absolute top-5 right-6 text-[10px] uppercase font-black tracking-widest text-blue-300 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-500/30">
              {activeType === 'cover' ? 'Narrative Letter' : 'Formal Corporate Submission'}
            </div>
            <pre className="text-xs sm:text-sm text-slate-200 font-sans whitespace-pre-wrap leading-relaxed bg-slate-950/90 p-8 rounded-2xl border border-slate-800/80 max-h-[550px] overflow-y-auto shadow-inner">
              {activeContent}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
};
