import React from 'react';
import { Crown, Shield, User, ToggleLeft, ToggleRight, ArrowRightLeft } from 'lucide-react';
import { socket } from '../services/socket';

export default function ParticipantList({ room, isHost, socketId, addToast }) {
  const toggleHostControl = () => {
    if (!isHost) return;
    socket.emit('toggle-host-control', { hostOnlyControl: !room.hostOnlyControl });
  };

  const transferHost = (targetSocketId, username) => {
    if (!isHost) return;
    if (confirm(`Transfer host control to ${username}?`)) {
      socket.emit('transfer-host', { targetSocketId });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#161619] border-l border-slate-800/80 w-full">
      {/* Header */}
      <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-[#121214]">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
          <User className="w-4 h-4 text-netflix-red" />
          <span>Participants</span>
        </div>
        <span className="text-[11px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full">
          {room?.participants?.length || 0} active
        </span>
      </div>

      {/* Host Settings Bar */}
      {isHost && (
        <div className="p-3 bg-black/40 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">Host-Only Control</span>
          </div>
          <button
            onClick={toggleHostControl}
            className="text-netflix-red hover:text-white transition-colors"
          >
            {room.hostOnlyControl ? (
              <ToggleRight className="w-6 h-6 text-netflix-red" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-slate-500" />
            )}
          </button>
        </div>
      )}

      {/* Participant List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {room?.participants?.map((p) => {
          const isSelf = p.socketId === socketId;
          const isUserHost = p.socketId === room.hostId;

          return (
            <div
              key={p.socketId}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                isUserHost
                  ? 'bg-amber-500/10 border-amber-500/30 text-white'
                  : 'bg-[#202024] border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isUserHost
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="truncate">{p.username}</span>
                    {isSelf && (
                      <span className="text-[10px] text-netflix-red font-normal">(You)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isUserHost ? 'Room Host' : 'Viewer'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isUserHost && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}

                {isHost && !isUserHost && (
                  <button
                    onClick={() => transferHost(p.socketId, p.username)}
                    title="Make Host"
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors text-xs flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
