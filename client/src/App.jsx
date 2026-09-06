import React, { useState, useEffect, useCallback } from 'react';
import { socket } from './services/socket';
import { useVideoSync } from './hooks/useVideoSync';

import Header from './components/Header';
import RoomLobby from './components/RoomLobby';
import VideoPlayer from './components/VideoPlayer';
import VideoUploader from './components/VideoUploader';
import ChatPanel from './components/ChatPanel';
import ParticipantList from './components/ParticipantList';
import ToastContainer from './components/ToastContainer';
import DisclaimerModal from './components/DisclaimerModal';
import { MessageSquare, Users, Film, AlertCircle } from 'lucide-react';

export default function App() {
  const [room, setRoom] = useState(null);
  const [username, setUsername] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('chat'); // 'chat' or 'participants'
  const [showParticipants, setShowParticipants] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast Notification Manager
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const isHost = room ? room.hostId === socket.id : false;
  const canControl = room ? (!room.hostOnlyControl || isHost) : false;

  // Custom Video Sync Hook
  const {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    driftMs,
    handlePlay,
    handlePause,
    handleSeek,
    setCurrentTime,
    setDuration,
    setIsPlaying
  } = useVideoSync({ room, isHost, canControl, addToast });

  // Socket Connection Setup
  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      console.log('Connected to socket server:', socket.id);
    };

    const onDisconnect = () => {
      console.log('Disconnected from socket server');
      addToast('Disconnected from server. Attempting reconnection...', 'warning');
    };

    const onErrorNotification = ({ message }) => {
      addToast(message, 'error');
    };

    const onRoomCreated = ({ room }) => {
      setRoom(room);
      setIsConnecting(false);
      addToast(`Room ${room.id} created successfully!`, 'success');
    };

    const onRoomJoined = ({ room }) => {
      setRoom(room);
      setIsConnecting(false);
      addToast(`Joined room ${room.id}!`, 'success');
    };

    const onRoomUpdated = ({ room }) => {
      setRoom(room);
    };

    const onVideoUpdated = ({ room, video }) => {
      setRoom(room);
      addToast(`New video stream loaded: ${video.originalName}`, 'info');
    };

    const onHostTransferred = ({ newHost, room }) => {
      setRoom(room);
      addToast(`${newHost.username} is now the room host!`, 'info');
    };

    const onChatMessageReceived = ({ message }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chat: [...prev.chat, message]
        };
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error-notification', onErrorNotification);
    socket.on('room-created', onRoomCreated);
    socket.on('room-joined', onRoomJoined);
    socket.on('room-updated', onRoomUpdated);
    socket.on('video-updated', onVideoUpdated);
    socket.on('host-transferred', onHostTransferred);
    socket.on('chat-message-received', onChatMessageReceived);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('error-notification', onErrorNotification);
      socket.off('room-created', onRoomCreated);
      socket.off('room-joined', onRoomJoined);
      socket.off('room-updated', onRoomUpdated);
      socket.off('video-updated', onVideoUpdated);
      socket.off('host-transferred', onHostTransferred);
      socket.off('chat-message-received', onChatMessageReceived);
      socket.disconnect();
    };
  }, [addToast]);

  const handleCreateRoom = ({ username, roomName }) => {
    setUsername(username);
    setIsConnecting(true);
    socket.emit('create-room', { username, roomName }, (res) => {
      setIsConnecting(false);
      if (res?.error) addToast(res.error, 'error');
    });
  };

  const handleJoinRoom = ({ username, roomId }) => {
    setUsername(username);
    setIsConnecting(true);
    socket.emit('join-room', { username, roomId }, (res) => {
      setIsConnecting(false);
      if (res?.error) addToast(res.error, 'error');
    });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room');
    setRoom(null);
    addToast('You left the room.', 'info');
  };

  const handleVideoUploaded = (videoInfo) => {
    socket.emit('select-video', { videoInfo });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0f0f10] text-slate-100 font-sans">
      {/* Top Navbar */}
      <Header
        room={room}
        username={username}
        isHost={isHost}
        onLeaveRoom={handleLeaveRoom}
        showParticipants={sidebarTab === 'participants'}
        onToggleParticipants={() =>
          setSidebarTab((prev) => (prev === 'participants' ? 'chat' : 'participants'))
        }
        addToast={addToast}
      />

      {/* Main View Container */}
      {!room ? (
        <RoomLobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isConnecting={isConnecting}
          addToast={addToast}
        />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Left / Main Stage: Video Canvas or Uploader */}
          <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
            {room.video ? (
              <VideoPlayer
                videoUrl={room.video.url}
                videoRef={videoRef}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                driftMs={driftMs}
                canControl={canControl}
                isHost={isHost}
                hostName={room.hostName}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onChangeVideo={() => {
                  if (confirm('Load a new video file into the room?')) {
                    socket.emit('select-video', { videoInfo: null });
                  }
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-[#121215] to-[#0a0a0c]">
                <div className="w-full">
                  {canControl ? (
                    <VideoUploader
                      onVideoUploaded={handleVideoUploaded}
                      isHost={isHost}
                      canControl={canControl}
                      currentUser={username}
                      addToast={addToast}
                    />
                  ) : (
                    <div className="text-center p-8 glass-panel max-w-md mx-auto rounded-3xl space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-netflix-red/10 border border-netflix-red/30 flex items-center justify-center text-netflix-red">
                        <Film className="w-8 h-8 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Waiting for Host Video</h3>
                      <p className="text-xs text-slate-400">
                        The room host ({room.hostName}) hasn't selected a video yet. Once uploaded, streaming playback will begin automatically.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Chat & Participants Panel */}
          <div className="w-full md:w-80 lg:w-96 h-64 md:h-full flex flex-col shrink-0 border-t md:border-t-0 border-slate-800">
            {/* Sidebar Tab Switcher */}
            <div className="flex bg-[#121214] border-b border-slate-800">
              <button
                onClick={() => setSidebarTab('chat')}
                className={`flex-1 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
                  sidebarTab === 'chat'
                    ? 'border-netflix-red text-white bg-white/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </button>
              <button
                onClick={() => setSidebarTab('participants')}
                className={`flex-1 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border-b-2 ${
                  sidebarTab === 'participants'
                    ? 'border-netflix-red text-white bg-white/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                People ({room.participants?.length || 0})
              </button>
            </div>

            {/* Sidebar Tab Content */}
            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'chat' ? (
                <ChatPanel room={room} currentUser={username} addToast={addToast} />
              ) : (
                <ParticipantList
                  room={room}
                  isHost={isHost}
                  socketId={socket.id}
                  addToast={addToast}
                />
              )}
            </div>
          </div>

        </div>
      )}

      {/* Global Toasts */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Legal & Permissions Disclaimer Modal */}
      <DisclaimerModal isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
    </div>
  );
}
