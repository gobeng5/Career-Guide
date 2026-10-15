import { X, CheckCircle2, AlertTriangle, Sparkles, BookOpen } from 'lucide-react';

interface XYZModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const XYZModal = ({ isOpen, onClose }: XYZModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Google's XYZ Resume Formula</h2>
            <p className="text-xs text-slate-400">The gold standard framework used by top tech recruiters</p>
          </div>
        </div>

        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-300 mb-2">The Formula Structure:</p>
          <div className="text-base text-slate-200 font-mono bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            Accomplished <span className="text-emerald-400 font-bold">[X]</span> as measured by <span className="text-amber-400 font-bold">[Y]</span>, by doing <span className="text-sky-400 font-bold">[Z]</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              X
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-400">Accomplished [X] (Action & Outcome)</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Start with a commanding action verb (e.g. Spearheaded, Engineered, Overhauled, Optimized). Clearly describe the specific result or business outcome achieved.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              Y
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-400">Measured by [Y] (Quantifiable Metric)</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Concrete numbers that substantiate your impact: percentages (35%), dollar amounts ($120k saved), latency reductions (from 400ms to 45ms), user scale (1.5M active users), or speed multipliers (3x).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">
              Z
            </div>
            <div>
              <h4 className="text-sm font-bold text-sky-400">By Doing [Z] (Methodology & Tools)</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                The technical method, architecture, or tools you used (e.g., "by architecting a Redis caching layer", "by migrating monolithic microservices to Kubernetes").
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Real-World Transformation Example
          </h4>
          <div className="space-y-2">
            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-xs">
              <span className="text-red-400 font-bold flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Weak Generic Bullet:
              </span>
              <p className="text-slate-300">"Worked on improving website checkout page speed and helped customers buy items faster."</p>
            </div>
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Google XYZ Rewritten Bullet:
              </span>
              <p className="text-slate-200">
                "<span className="text-emerald-300 font-medium">Accelerated checkout completion rates</span> as <span className="text-amber-300 font-medium">measured by a 32% drop in cart abandonment and $180k added revenue</span>, <span className="text-sky-300 font-medium">by refactoring React render trees and implementing Redis session caching</span>."
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition"
          >
            Got it, Let's Optimize!
          </button>
        </div>
      </div>
    </div>
  );
};

