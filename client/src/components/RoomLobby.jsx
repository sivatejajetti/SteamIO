import React, { useState, useEffect } from 'react';
import { Film, Sparkles, Users, ArrowRight, Lock, ShieldCheck, PlayCircle, PlusCircle } from 'lucide-react';

export default function RoomLobby({ onCreateRoom, onJoinRoom, isConnecting, addToast }) {
  const [activeTab, setActiveTab] = useState('join'); // 'join' or 'create'
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');

  // Check URL query parameters for room parameter e.g. ?room=SYNC-89A2
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom) {
      setRoomCode(urlRoom.toUpperCase());
      setActiveTab('join');
    }

    const savedUsername = localStorage.getItem('streamio_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      addToast?.('Please enter your display username', 'warning');
      return;
    }
    localStorage.setItem('streamio_username', username.trim());
    onCreateRoom({ username: username.trim(), roomName: roomName.trim() || `${username.trim()}'s Cinema` });
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      addToast?.('Please enter your display username', 'warning');
      return;
    }
    if (!roomCode.trim()) {
      addToast?.('Please enter a valid room code', 'warning');
      return;
    }
    localStorage.setItem('streamio_username', username.trim());
    onJoinRoom({ username: username.trim(), roomId: roomCode.trim().toUpperCase() });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#0f0f10] via-[#141417] to-[#0b0b0d]">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: App Pitch & Aesthetics */}
        <div className="md:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-netflix-red/10 border border-netflix-red/30 text-netflix-red text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private Movie Theater</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.1]">
            Watch Together in <span className="text-transparent bg-clip-text bg-gradient-to-r from-netflix-red via-rose-500 to-amber-500">Perfect Sync</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Create a private lounge, stream high-definition local videos, and enjoy real-time playback synchronization with your friends anywhere.
          </p>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-black/40 border border-slate-800/60 flex items-center gap-3 text-xs text-slate-300">
              <PlayCircle className="w-5 h-5 text-netflix-red shrink-0" />
              <span>HTTP Range Video Streaming</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-slate-800/60 flex items-center gap-3 text-xs text-slate-300">
              <Users className="w-5 h-5 text-netflix-red shrink-0" />
              <span>Sub-Second Drift Correction</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-slate-800/60 flex items-center gap-3 text-xs text-slate-300">
              <Lock className="w-5 h-5 text-netflix-red shrink-0" />
              <span>Host Control Delegation</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-slate-800/60 flex items-center gap-3 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-netflix-red shrink-0" />
              <span>Private & Secure Rooms</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div className="md:col-span-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
            
            {/* Tabs */}
            <div className="flex p-1 bg-black/50 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'join'
                    ? 'bg-netflix-red text-white shadow-lg shadow-netflix-red/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Join Room
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'create'
                    ? 'bg-netflix-red text-white shadow-lg shadow-netflix-red/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Create Room
              </button>
            </div>

            {/* Join Form */}
            {activeTab === 'join' ? (
              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full px-4 py-3 bg-black/60 border border-slate-800 focus:border-netflix-red rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Room Code
                  </label>
                  <input
                    type="text"
                    required
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SYNC-89A2"
                    className="w-full px-4 py-3 bg-black/60 border border-slate-800 focus:border-netflix-red rounded-xl text-sm font-mono tracking-widest text-white uppercase placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-3.5 bg-netflix-red hover:bg-netflix-darkRed disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-netflix-red/25 mt-2"
                >
                  <span>{isConnecting ? 'Joining Room...' : 'Enter Watch Lounge'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Create Form */
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Host Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Host Alex"
                    className="w-full px-4 py-3 bg-black/60 border border-slate-800 focus:border-netflix-red rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Room Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g. Friday Night Movie Lounge"
                    className="w-full px-4 py-3 bg-black/60 border border-slate-800 focus:border-netflix-red rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-3.5 bg-netflix-red hover:bg-netflix-darkRed disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-netflix-red/25 mt-2"
                >
                  <span>{isConnecting ? 'Creating Room...' : 'Launch Private Room'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
