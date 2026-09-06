import { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from '../services/socket';

export function useVideoSync({ room, isHost, canControl, addToast }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [driftMs, setDriftMs] = useState(0);

  // Prevent local event emission feedback loops
  const isLocalActionRef = useRef(false);
  const ignoreNextSeekRef = useRef(false);

  // Helper to trigger brief local action protection
  const triggerLocalAction = () => {
    isLocalActionRef.current = true;
    setTimeout(() => {
      isLocalActionRef.current = false;
    }, 400);
  };

  // Perform Play action
  const handlePlay = useCallback(() => {
    if (!canControl) {
      addToast?.('Only the host can control playback', 'warning');
      return;
    }
    if (!videoRef.current) return;

    triggerLocalAction();
    const time = videoRef.current.currentTime;
    setIsPlaying(true);
    socket.emit('play', { timestamp: time });
  }, [canControl, addToast]);

  // Perform Pause action
  const handlePause = useCallback(() => {
    if (!canControl) {
      addToast?.('Only the host can control playback', 'warning');
      return;
    }
    if (!videoRef.current) return;

    triggerLocalAction();
    const time = videoRef.current.currentTime;
    setIsPlaying(false);
    socket.emit('pause', { timestamp: time });
  }, [canControl, addToast]);

  // Perform Seek action
  const handleSeek = useCallback((targetTime) => {
    if (!canControl) {
      addToast?.('Only the host can control playback', 'warning');
      return;
    }
    if (!videoRef.current) return;

    triggerLocalAction();
    ignoreNextSeekRef.current = true;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    socket.emit('seek', { timestamp: targetTime });
  }, [canControl, addToast]);

  // Sync state received from server (Heartbeat or Join)
  const applyRemoteSync = useCallback(({ playback, serverTime }) => {
    const video = videoRef.current;
    if (!video || isLocalActionRef.current) return;

    const { isPlaying: remoteIsPlaying, timestamp: remoteTime, lastUpdated } = playback;
    const now = Date.now();
    const elapsedSinceUpdate = remoteIsPlaying ? (now - (lastUpdated || now)) / 1000 : 0;
    const expectedTime = remoteTime + elapsedSinceUpdate;

    const drift = Math.abs(video.currentTime - expectedTime);
    setDriftMs(Math.round(drift * 1000));

    // Hard Sync: Large drift (> 1.0 second)
    if (drift > 1.0) {
      ignoreNextSeekRef.current = true;
      video.currentTime = expectedTime;
      setCurrentTime(expectedTime);
      video.playbackRate = 1.0;
    }
    // Soft Sync: Micro drift (0.2s - 1.0s) -> adjust playback rate smoothly
    else if (drift > 0.2 && remoteIsPlaying) {
      if (video.currentTime < expectedTime) {
        video.playbackRate = 1.05; // Slightly speed up to catch up
      } else {
        video.playbackRate = 0.95; // Slightly slow down
      }
    } else {
      video.playbackRate = 1.0;
    }

    // Playback state sync
    if (remoteIsPlaying && video.paused) {
      video.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Autoplay policy restricted unmuted play, trying muted:', err.message);
        video.muted = true;
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    } else if (!remoteIsPlaying && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Set up socket event handlers
  useEffect(() => {
    if (!room) return;

    const onPlaybackUpdated = ({ action, playback, senderSocketId }) => {
      if (senderSocketId === socket.id) return; // Skip self update

      const video = videoRef.current;
      if (!video) return;

      if (action === 'play') {
        ignoreNextSeekRef.current = true;
        video.currentTime = playback.timestamp;
        video.play().then(() => setIsPlaying(true)).catch(() => {});
        addToast?.(`Playback started by ${room.participants.find(p => p.socketId === senderSocketId)?.username || 'user'}`, 'info');
      } else if (action === 'pause') {
        video.currentTime = playback.timestamp;
        video.pause();
        setIsPlaying(false);
        addToast?.(`Playback paused by ${room.participants.find(p => p.socketId === senderSocketId)?.username || 'user'}`, 'info');
      } else if (action === 'seek') {
        ignoreNextSeekRef.current = true;
        video.currentTime = playback.timestamp;
        setCurrentTime(playback.timestamp);
        addToast?.(`Seeked to ${formatTime(playback.timestamp)}`, 'info');
      }
    };

    const onSyncTick = (data) => {
      applyRemoteSync(data);
    };

    const onSyncState = (data) => {
      applyRemoteSync(data);
    };

    socket.on('playback-updated', onPlaybackUpdated);
    socket.on('sync-tick', onSyncTick);
    socket.on('sync-state', onSyncState);

    // Initial state setup if available
    if (room.playback) {
      applyRemoteSync({ playback: room.playback, serverTime: Date.now() });
    }

    return () => {
      socket.off('playback-updated', onPlaybackUpdated);
      socket.off('sync-tick', onSyncTick);
      socket.off('sync-state', onSyncState);
    };
  }, [room, applyRemoteSync, addToast]);

  return {
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
  };
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
