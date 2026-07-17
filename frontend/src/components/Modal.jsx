import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[88vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} animate-in fade-in zoom-in-95 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-slate-950/20`}>
        <div className="shrink-0 border-b border-border bg-bg/60 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-textPrimary">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-textSecondary hover:bg-danger/10 hover:text-danger"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
