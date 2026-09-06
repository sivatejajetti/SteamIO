import React from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export default function ToastContainer({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
      {toasts.map((toast) => {
        const icons = {
          info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          error: <XCircle className="w-5 h-5 text-netflix-red shrink-0" />
        };

        const borders = {
          info: 'border-blue-500/30',
          success: 'border-emerald-500/30',
          warning: 'border-amber-500/30',
          error: 'border-netflix-red/50'
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl glass-panel shadow-2xl border ${borders[toast.type] || borders.info} animate-fade-in text-sm text-slate-100 backdrop-blur-md`}
          >
            {icons[toast.type] || icons.info}
            <div className="flex-1 font-medium leading-snug">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
