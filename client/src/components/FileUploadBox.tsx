import { useRef, useState } from 'react';
import { Upload, FileText, X, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface FileUploadBoxProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accept?: string;
  minHeight?: string;
  accentColor?: 'blue' | 'sky';
}

export const FileUploadBox = ({
  label,
  sublabel,
  value,
  onChange,
  placeholder,
  accept = '.pdf,.docx,.doc,.txt,.md',
  minHeight = 'min-h-[170px]',
  accentColor = 'blue'
}: FileUploadBoxProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to extract text from file.');
      }

      const data = await response.json();
      onChange(data.text);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setUploadError(err.message || 'Error parsing document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const clearContent = () => {
    onChange('');
    setFileName(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isSky = accentColor === 'sky';

  return (
    <div className="glass-card-interactive rounded-2xl p-5 flex flex-col relative group">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isSky
                ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40'
                : 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
            }`}
          >
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 m-0">
              {label}
            </h3>
            {sublabel && <p className="text-[11px] text-slate-400 m-0">{sublabel}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {value && (
            <button
              onClick={clearContent}
              type="button"
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/40 hover:bg-rose-950/40 border border-blue-900/40 hover:border-rose-900/60 transition cursor-pointer"
              title="Clear text"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept={accept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 ${
              isSky
                ? 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30 hover:border-sky-500/60'
                : 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border-blue-500/30 hover:border-blue-500/60'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Upload (PDF/Word/TXT)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Drop Zone & Textarea */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex-1 rounded-xl transition-all duration-200 border ${
          dragActive
            ? 'border-blue-400 bg-blue-950/50 ring-4 ring-blue-500/20'
            : 'border-blue-950/80 bg-slate-950/70 hover:border-blue-800/80'
        }`}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${minHeight} p-4 text-xs leading-relaxed bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none resize-y rounded-xl font-sans`}
        />

        {fileName && (
          <div className="absolute top-2.5 right-2.5 bg-slate-900/90 text-blue-300 text-xs px-3 py-1 rounded-lg border border-blue-500/40 flex items-center gap-1.5 backdrop-blur-md shadow-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="max-w-[160px] truncate font-medium">{fileName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFileName(null);
              }}
              className="hover:text-white ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {dragActive && (
          <div className="absolute inset-0 bg-blue-950/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 text-center pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center mb-2 animate-bounce">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">Drop your document here</p>
            <p className="text-xs text-blue-300 mt-0.5">Supports PDF, Word (.docx), or Text files</p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-rose-400 mt-2 flex items-center gap-1 bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-900/40">
          <X className="w-3.5 h-3.5 shrink-0" /> {uploadError}
        </p>
      )}

      {/* Footer info bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 px-1 font-medium">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-400" />
          Supports PDF, Word (.docx), TXT or paste
        </span>
        <span className="text-slate-400 bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-900/30">
          <span className="text-white font-semibold">{wordCount.toLocaleString()}</span> words &bull; {charCount.toLocaleString()} chars
        </span>
      </div>
    </div>
  );
};
