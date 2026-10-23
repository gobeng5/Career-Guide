import { useState, useRef } from 'react';
import { Upload, Copy, Check, Download, Loader2, X } from 'lucide-react';

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

type Mode = 'professional' | 'conversational' | 'academic' | 'stealth';

const MODES: { id: Mode; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'conversational', label: 'Conversational' },
  { id: 'academic', label: 'Academic' },
  { id: 'stealth', label: 'Heavy rewrite' }
];

export const HumanizerTab = () => {
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<Mode>('professional');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<HumanizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
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
      setError('Could not read text from this file. Try a PDF, DOCX or TXT file, or paste the text.');
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleHumanize = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setError(null);

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
      setError('The rewrite didn’t finish. Try again in a moment.');
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
          title: '',
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
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-line">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[13px] text-muted" id="mode-label">
              Style
            </span>
            <div className="segmented" role="group" aria-labelledby="mode-label">
              {MODES.map((m) => (
                <button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadSampleAiText} type="button" className="btn btn-ghost btn-sm">
              Load example
            </button>
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
              className="btn btn-secondary btn-sm"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {isUploading ? 'Reading file' : 'Upload file'}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 md:divide-x divide-line">
          <div className="p-5 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-2 min-h-[30px]">
              <label htmlFor="humanize-input" className="text-[13.5px] font-medium text-ink">
                Original
              </label>
              {fileName && (
                <span className="chip chip-neutral">
                  <span className="max-w-[160px] truncate">{fileName}</span>
                  <button onClick={() => setFileName(null)} aria-label="Dismiss file name" className="hover:text-ink">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <textarea
              id="humanize-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste the text you want to rewrite, or upload a file."
              className="field h-80 resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between text-xs text-subtle mt-2">
              <span className="tabular-nums">{wordCount} words</span>
              {inputText && (
                <button
                  onClick={() => {
                    setInputText('');
                    setFileName(null);
                    setResult(null);
                  }}
                  className="hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-6 flex flex-col border-t md:border-t-0 border-line">
            <div className="flex items-center justify-between mb-2 min-h-[30px]">
              <label htmlFor="humanize-output" className="text-[13.5px] font-medium text-ink">
                Rewritten
              </label>
              {result && (
                <div className="flex items-center gap-1">
                  <button onClick={handleCopy} className="btn btn-ghost btn-sm">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={handleDownloadTxt} className="btn btn-ghost btn-sm">
                    .txt
                  </button>
                  <button onClick={handleDownloadDocx} disabled={isExporting} className="btn btn-ghost btn-sm">
                    <Download className="w-3.5 h-3.5" /> Word
                  </button>
                </div>
              )}
            </div>
            <textarea
              id="humanize-output"
              readOnly
              value={result?.humanized || ''}
              placeholder="The rewritten text will appear here."
              className="field h-80 resize-none leading-relaxed !bg-sunken"
            />
            <div className="text-xs text-subtle mt-2 tabular-nums">
              {result ? `${result.stats.wordCount} words` : ' '}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-3.5 border-t border-line bg-sunken rounded-b-lg">
          {error && <p className="text-[13px] text-bad mr-auto">{error}</p>}
          <button onClick={handleHumanize} disabled={!inputText.trim() || isProcessing} className="btn btn-primary">
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {isProcessing ? 'Rewriting' : 'Rewrite text'}
          </button>
        </div>
      </section>

      {result && (
        <section className="panel">
          <dl className="grid grid-cols-2 md:grid-cols-4 divide-line md:divide-x [&>div]:p-5 [&>div]:sm:px-6">
            <div>
              <dt className="text-[13px] text-muted">AI likelihood</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">
                <span className="text-subtle line-through decoration-1 mr-2 text-base font-normal">
                  {result.stats.originalAiScore}%
                </span>
                {result.stats.newAiScore}%
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Human score</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{result.stats.humanScore}%</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Sentence variety</dt>
              <dd className="mt-1 text-[15px] font-semibold text-ink">{result.stats.newBurstiness}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Stock phrases replaced</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{result.stats.markersRemoved}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
};
