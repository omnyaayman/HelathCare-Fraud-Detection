import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[#1c2128] border border-[#383e47] rounded-lg w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[85vh] flex flex-col shadow-lg shadow-black/40`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#383e47] shrink-0">
          <h2 className="text-sm font-medium text-textPrimary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-textSecondary hover:text-textPrimary hover:bg-[#2d333b] transition-colors duration-150"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
