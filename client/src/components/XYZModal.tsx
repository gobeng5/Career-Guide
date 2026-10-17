import { useEffect } from 'react';
import { X } from 'lucide-react';

interface XYZModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const XYZModal = ({ isOpen, onClose }: XYZModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parts = [
    {
      key: 'X',
      title: 'What you accomplished',
      body: 'Open with a strong verb and the result, not the duty. "Cut", "launched" and "rebuilt" say more than "worked on" or "responsible for".'
    },
    {
      key: 'Y',
      title: 'How it was measured',
      body: 'A number that proves the result: a percentage, money saved or earned, time reduced, or how many people it reached.'
    },
    {
      key: 'Z',
      title: 'How you did it',
      body: 'The method or tools you used, specific enough that a reader in your field recognises the work.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="xyz-title"
        onClick={(e) => e.stopPropagation()}
        className="panel w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
          <div>
            <h2 id="xyz-title" className="text-lg font-semibold text-ink">
              How scoring works
            </h2>
            <p className="text-[13px] text-muted mt-0.5">
              Each bullet is checked against the XYZ formula recruiters at Google recommend.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm !px-1.5" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="font-serif text-[17px] leading-relaxed text-ink">
            Accomplished <b>[X]</b> as measured by <b>[Y]</b>, by doing <b>[Z]</b>.
          </p>

          <dl className="space-y-3">
            {parts.map((p) => (
              <div key={p.key} className="flex gap-3">
                <dt className="w-6 h-6 shrink-0 rounded bg-accent-soft text-accent text-xs font-semibold flex items-center justify-center">
                  {p.key}
                </dt>
                <dd>
                  <p className="text-[13.5px] font-medium text-ink">{p.title}</p>
                  <p className="text-[13px] text-muted mt-0.5 leading-relaxed">{p.body}</p>
                </dd>
              </div>
            ))}
          </dl>

          <div className="rounded-md border border-line divide-y divide-line text-[13.5px]">
            <div className="p-3.5">
              <p className="text-xs font-medium text-bad mb-1">Before</p>
              <p className="text-muted">Worked on improving checkout page speed and helped customers buy items faster.</p>
            </div>
            <div className="p-3.5">
              <p className="text-xs font-medium text-good mb-1">After</p>
              <p className="text-ink">
                Raised checkout completion, measured by a 32% drop in cart abandonment and $180k added revenue, by
                refactoring React rendering and adding Redis session caching.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-line flex justify-end">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
