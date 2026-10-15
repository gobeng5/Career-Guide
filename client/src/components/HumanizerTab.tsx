import { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Copy,
  Check,
  Download,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Flame,
  ArrowRight,
  X,
  Zap
} from 'lucide-react';

interface HumanizeStats {
  originalAiScore: number;
  newAiScore: number;
  humanScore: number;
  originalBurstiness: string;
  newBurstiness: string;
  markersRemoved: number;
  wordCount: number;
}

interface HumanizeResult {
  humanized: string;
  stats: HumanizeStats;
}

export const HumanizerTab = () => {
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<'professional' | 'conversational' | 'academic' | 'stealth'>('professional');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<HumanizeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to parse uploaded document.');
      const data = await response.json();
      setInputText(data.text);
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleHumanize = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);

    const apiKey = localStorage.getItem('deepseek_api_key') || '';
    const model = localStorage.getItem('deepseek_model') || 'deepseek-chat';

    try {
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-deepseek-api-key': apiKey,
          'x-deepseek-model': model
        },
        body: JSON.stringify({
          text: inputText,
          mode
        })
      });

      if (!response.ok) throw new Error('Humanization failed.');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Humanize error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSampleAiText = () => {
    setInputText(`In today's fast-paced digital world, it is crucial to recognize that artificial intelligence serves as a beacon of transformative innovation. Furthermore, by delving into the multifaceted realm of technological advancement, modern enterprises can seamlessly foster unprecedented growth. It stands as a testament to human ingenuity that machine learning algorithms can meticulously orchestrate complex operational workflows, thereby unlocking synergistic value across organizations. Moreover, navigating this dynamic landscape requires an unwavering commitment to excellence, which is a pivotal game-changer for forward-thinking leadership.`);
    setFileName(null);
  };

  const handleCopy = () => {
    if (!result?.humanized) return;
    navigator.clipboard.writeText(result.humanized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    if (!result?.humanized) return;
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Humanized Document',
          content: result.humanized,
          filename: 'Humanized_Document.docx'
        })
      });

      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Humanized_Document.docx';
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
    if (!result?.humanized) return;
    const blob = new Blob([result.humanized], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Humanized_Document.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Deep AI Humanizer & Detector Bypass
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              Transform Robotic AI Text into Authentic Human Voice
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Eliminates dead giveaways ("delve into", "testament to", "orchestrated", "seamlessly"), injects organic sentence burstiness, and re-balances cadence to pass AI detectors (GPTZero, Turnitin, Copyleaks).
            </p>
          </div>

          <button
            onClick={loadSampleAiText}
            type="button"
            className="text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-2 self-start md:self-auto cursor-pointer shadow-md active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-blue-400" /> Try Sample AI Text
          </button>
        </div>
      </div>

      {/* Controls Bar: Mode selector & File Upload */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap">
            Humanization Mode:
          </label>
          <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setMode('professional')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                mode === 'professional'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Professional Polish
            </button>
            <button
              onClick={() => setMode('conversational')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                mode === 'conversational'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Conversational & Direct
            </button>
            <button
              onClick={() => setMode('academic')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                mode === 'academic'
                  ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Academic Rigor
            </button>
            <button
              onClick={() => setMode('stealth')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mode === 'stealth'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-200" /> Stealth Bypass
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.docx,.doc,.txt,.md"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 text-blue-400" /> Upload File (PDF/DOCX/TXT)
              </>
            )}
          </button>

          <button
            onClick={handleHumanize}
            disabled={!inputText.trim() || isProcessing}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg ${
              inputText.trim() && !isProcessing
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-blue-500/25 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Humanizing...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" /> Humanize Text
              </>
            )}
          </button>
        </div>
      </div>

      {/* Input / Output Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Input Panel */}
        <div className="glass-card rounded-3xl p-5 flex flex-col shadow-xl relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Original Text / Document
            </span>
            {fileName && (
              <span className="text-[11px] bg-slate-900 px-3 py-1 rounded-lg text-blue-300 border border-blue-500/30 flex items-center gap-1.5 font-medium">
                {fileName}
                <button onClick={() => setFileName(null)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste any AI-generated essay, resume, cover letter, or article here... Or click 'Upload File' above to parse a PDF or DOCX file."
            className="w-full h-80 p-4 text-xs bg-slate-950/80 border border-slate-800/80 rounded-2xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans leading-relaxed"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 px-1 font-medium">
            <span>{wordCount} words</span>
            {inputText && (
              <button
                onClick={() => {
                  setInputText('');
                  setFileName(null);
                  setResult(null);
                }}
                className="text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Output Panel */}
        <div className="glass-card rounded-3xl p-5 flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Humanized Output
            </span>
            {result && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="text-xs font-bold px-3 py-1 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700 flex items-center gap-1 transition cursor-pointer active:scale-95"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleDownloadDocx}
                  disabled={isExporting}
                  className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 flex items-center gap-1 transition cursor-pointer active:scale-95"
                >
                  <Download className="w-3 h-3" /> Word (.docx)
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="text-xs font-bold px-3 py-1 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700 flex items-center gap-1 transition cursor-pointer active:scale-95"
                >
                  <FileText className="w-3 h-3" /> .txt
                </button>
              </div>
            )}
          </div>
          <textarea
            readOnly
            value={result?.humanized || ''}
            placeholder="Humanized text will appear here with dynamic sentence length variations, authentic tone, and zero robotic cliches..."
            className="w-full h-80 p-4 text-xs bg-slate-950/80 border border-slate-800/80 rounded-2xl text-slate-100 placeholder-slate-600 focus:outline-none resize-none font-sans leading-relaxed"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 px-1 font-medium">
            <span>{result ? `${result.stats.wordCount} words` : '0 words'}</span>
            <span className="text-emerald-400">{result ? '✓ Natural Human Cadence' : ''}</span>
          </div>
        </div>
      </div>

      {/* AI Score Comparison Banner (When result is available) */}
      {result && (
        <div className="glass-card rounded-3xl p-6 shadow-2xl animate-fadeIn border-t-2 border-t-blue-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* AI Score Before vs After */}
            <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-rose-400 uppercase font-black tracking-wider block">AI Before</span>
                <span className="text-2xl font-black text-rose-400">{result.stats.originalAiScore}%</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-black tracking-wider block">After Humanizing</span>
                <span className="text-2xl font-black text-emerald-400">{result.stats.newAiScore}%</span>
              </div>
            </div>

            {/* Human Authenticity */}
            <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shadow-sm">
              <span className="text-[10px] text-sky-400 uppercase font-black tracking-wider block">Human Authenticity</span>
              <span className="text-2xl font-black text-white">{result.stats.humanScore}%</span>
              <p className="text-[10px] text-slate-400 mt-0.5">High natural variance</p>
            </div>

            {/* Burstiness Metric */}
            <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shadow-sm">
              <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider block">Burstiness Score</span>
              <span className="text-sm font-black text-white block mt-1">{result.stats.newBurstiness}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Varies between 4 to 28 words</p>
            </div>

            {/* AI Cliches Removed */}
            <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 shadow-sm">
              <span className="text-[10px] text-sky-400 uppercase font-black tracking-wider block">Cliches Replaced</span>
              <span className="text-2xl font-black text-sky-400">{result.stats.markersRemoved}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Robotic markers eliminated</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
