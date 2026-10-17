import { useId, useRef, useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';

interface FileUploadBoxProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accept?: string;
  minHeight?: string;
}

export const FileUploadBox = ({
  label,
  sublabel,
  value,
  onChange,
  placeholder,
  accept = '.pdf,.docx,.doc,.txt,.md',
  minHeight = 'min-h-[170px]'
}: FileUploadBoxProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

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
        throw new Error(errData.error || 'Could not read text from this file. Try a PDF, DOCX or TXT file, or paste the text.');
      }

      const data = await response.json();
      onChange(data.text);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setUploadError(err.message || 'Could not read this file.');
      setFileName(null);
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

  const clearContent = () => {
    onChange('');
    setFileName(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div className="min-h-[38px] flex flex-col justify-end">
          <label htmlFor={textareaId} className="text-[13.5px] font-medium text-ink">
            {label}
          </label>
          {sublabel && <p className="text-xs text-muted mt-0.5">{sublabel}</p>}
        </div>

        <div className="flex items-center gap-1.5">
          {value && (
            <button onClick={clearContent} type="button" className="btn btn-ghost btn-sm">
              Clear
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
            className="btn btn-secondary btn-sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading file
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" /> Upload file
              </>
            )}
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className="relative flex-1"
      >
        <textarea
          id={textareaId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`field ${minHeight} h-full resize-y leading-relaxed`}
        />

        {fileName && !isUploading && (
          <div className="absolute top-2 right-2 chip chip-neutral bg-surface">
            <FileText className="w-3 h-3" />
            <span className="max-w-[160px] truncate">{fileName}</span>
            <button onClick={() => setFileName(null)} aria-label="Dismiss file name" className="hover:text-ink">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {dragActive && (
          <div className="absolute inset-0 rounded-md border-2 border-dashed border-accent bg-accent-soft/90 flex items-center justify-center pointer-events-none">
            <p className="text-sm font-medium text-ink">Drop to upload</p>
          </div>
        )}
      </div>

      {uploadError && <p className="text-xs text-bad mt-2">{uploadError}</p>}

      <div className="flex items-center justify-between text-xs text-subtle mt-2">
        <span>PDF, DOCX or TXT, or paste text</span>
        <span className="tabular-nums">{wordCount.toLocaleString()} words</span>
      </div>
    </div>
  );
};
