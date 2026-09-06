import React, { useState } from 'react';
import { Film, Copy, Check, Users, LogOut, Share2, Crown, Shield } from 'lucide-react';

export default function Header({ room, username, isHost, onLeaveRoom, onToggleParticipants, showParticipants, addToast }) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    if (!room?.id) return;
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    addToast?.(`Room code ${room.id} copied to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    if (!room?.id) return;
    const url = `${window.location.origin}?room=${room.id}`;
    navigator.clipboard.writeText(url);
    addToast?.('Shareable link copied to clipboard!', 'success');
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#121214]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-netflix-red to-rose-600 flex items-center justify-center shadow-lg shadow-netflix-red/30">
          <Film className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
            Stream<span className="text-netflix-red">IO</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] text-slate-400 uppercase tracking-widest font-semibold ml-1">
            Watch Together
          </span>
        </div>
      </div>

      {/* Room Details & Actions */}
      {room && (
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Room Name & Code Pill */}
          <div className="flex items-center bg-black/40 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <span className="font-medium text-slate-300 hidden md:inline mr-2 border-r border-slate-700 pr-2">
              {room.name}
            </span>
            <span className="font-mono font-bold text-netflix-red tracking-wider mr-2">
              {room.id}
            </span>
            <button
              onClick={copyRoomCode}
              title="Copy Room Code"
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Share Link Button */}
          <button
            onClick={copyShareLink}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/50"
          >
            <Share2 className="w-3.5 h-3.5 text-netflix-red" />
            <span>Share</span>
          </button>

          {/* Participants Counter Toggle Button */}
          <button
            onClick={onToggleParticipants}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
              showParticipants
                ? 'bg-netflix-red/20 border-netflix-red/50 text-netflix-red'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{room.participants?.length || 1}</span>
            {isHost && <Crown className="w-3.5 h-3.5 text-amber-400 ml-0.5" />}
          </button>

          {/* Leave Room Button */}
          <button
            onClick={onLeaveRoom}
            title="Leave Room"
            className="p-2 text-slate-400 hover:text-netflix-red hover:bg-netflix-red/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
}
