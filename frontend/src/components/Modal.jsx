import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, wide, full }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[90vh] w-full ${full ? 'max-w-5xl' : wide ? 'max-w-3xl' : 'max-w-lg'} animate-scale-in flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-2xl shadow-slate-950/30`}>
        <div className="shrink-0 border-b border-border/60 bg-bg/60 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-textPrimary tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-textSecondary hover:bg-danger/10 hover:text-danger transition-colors"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-6 py-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
