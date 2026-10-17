import type { ReactNode } from 'react';

export const EmptyState = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="panel border-dashed px-6 py-14 text-center">
    <p className="text-[15px] font-medium text-ink">{title}</p>
    {children && <div className="text-[13.5px] text-muted mt-1.5 max-w-md mx-auto leading-relaxed">{children}</div>}
  </div>
);

export const LoadingState = ({ title, detail }: { title: string; detail?: string }) => (
  <div className="panel px-6 py-14 flex flex-col items-center text-center" role="status" aria-live="polite">
    <div className="spinner mb-4" />
    <p className="text-[15px] font-medium text-ink">{title}</p>
    {detail && <p className="text-[13px] text-muted mt-1">{detail}</p>}
  </div>
);

export const scoreTone = (score: number) => (score >= 85 ? 'good' : score >= 60 ? 'warn' : 'bad');
