import React from 'react';
import { ShieldAlert, Check } from 'lucide-react';

export default function DisclaimerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border border-slate-700/50 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 text-amber-400">
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Content Streaming Disclaimer</h3>
            <p className="text-xs text-slate-400">Important guidelines for private room hosting</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-300 bg-black/30 p-4 rounded-xl border border-slate-800 leading-relaxed">
          <p>
            StreamIO is built exclusively for private, synchronized playback between friends.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400">
            <li>Only upload or stream video files you have legal permission to share.</li>
            <li>Do not host or broadcast copyrighted movies without appropriate distribution rights.</li>
            <li>Video files are temporarily processed locally or on your private host server.</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-netflix-red hover:bg-netflix-darkRed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-netflix-red/20"
        >
          <Check className="w-5 h-5" />
          I Understand & Agree
        </button>
      </div>
    </div>
  );
}
