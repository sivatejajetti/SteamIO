import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Lock,
  Zap,
  RotateCcw,
  RotateCw,
  Crown,
  Upload
} from 'lucide-react';

export default function VideoPlayer({
  videoUrl,
  videoRef,
  isPlaying,
  currentTime,
  duration,
  driftMs,
  canControl,
  isHost,
  hostName,
  onPlay,
  onPause,
  onSeek,
  onTimeUpdate,
  onLoadedMetadata,
  onChangeVideo
}) {
  const containerRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const hideControlsTimeoutRef = useRef(null);

  // Auto-hide controls after inactivity
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleSeekChange = (e) => {
    const time = parseFloat(e.target.value);
    onSeek(time);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in chat or input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (canControl) {
          if (isPlaying) onPause();
          else onPlay();
        }
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowRight' && canControl) {
        e.preventDefault();
        onSeek(Math.min(duration, currentTime + 10));
      } else if (e.code === 'ArrowLeft' && canControl) {
        e.preventDefault();
        onSeek(Math.max(0, currentTime - 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, canControl, onPlay, onPause, onSeek]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group select-none"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={(e) => {
          setHasVideoError(false);
          onLoadedMetadata(e);
        }}
        onError={() => setHasVideoError(true)}
        onClick={() => {
          if (canControl) {
            if (isPlaying) onPause();
            else onPlay();
          }
        }}
        playsInline
        className="w-full h-full object-contain max-h-[82vh]"
      />

      {/* Video Loading Error Overlay Banner */}
      {hasVideoError && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-lg font-bold text-white">Google Drive Stream Access Warning</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Google Drive returned a restricted access error or virus scan prompt.
            </p>
            <div className="p-3 bg-black/60 rounded-xl border border-slate-800 text-left text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-200">How to fix in 10 seconds:</p>
              <p>1. Open Google Drive → Right-click video file → <strong>Share</strong>.</p>
              <p>2. Set permissions to <strong>"Anyone with the link can view"</strong>.</p>
              <p>3. Re-paste the link in StreamIO.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setHasVideoError(false);
                if (videoRef.current) videoRef.current.load();
              }}
              className="px-4 py-2 bg-netflix-red hover:bg-netflix-darkRed text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              Retry Stream
            </button>
            <button
              onClick={onChangeVideo}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              Select Different Video
            </button>
          </div>
        </div>
      )}

      {/* Sync Status Badge (Top Left) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
          <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Sync: <strong className="text-white font-mono">{driftMs}ms</strong></span>
        </div>
        {!canControl && (
          <div className="px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
            <Lock className="w-3.5 h-3.5" />
            <span>Host Control ({hostName})</span>
          </div>
        )}
      </div>

      {/* Change Video Button (Top Right, for Host) */}
      {canControl && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onChangeVideo}
            className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-netflix-red" />
            <span>Change Video</span>
          </button>
        </div>
      )}

      {/* Big Play / Pause Overlay Center Animation */}
      {showControls && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {canControl && (
            <button
              onClick={() => (isPlaying ? onPause() : onPlay())}
              className="pointer-events-auto w-20 h-20 rounded-full bg-netflix-red/90 hover:bg-netflix-red text-white flex items-center justify-center shadow-2xl shadow-netflix-red/40 transition-transform transform hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
            </button>
          )}
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-6xl mx-auto space-y-2">
          {/* Seek Progress Scrubber Bar */}
          <div className="relative flex items-center group/scrubber cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime || 0}
              disabled={!canControl}
              onChange={handleSeekChange}
              className="w-full h-1.5 bg-slate-700/70 hover:h-2 rounded-lg appearance-none cursor-pointer focus:outline-none transition-all"
            />
            {/* Custom filled progress track */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-netflix-red rounded-lg pointer-events-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between text-white pt-1">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Play/Pause Button */}
              <button
                disabled={!canControl}
                onClick={() => (isPlaying ? onPause() : onPlay())}
                className="p-1.5 hover:text-netflix-red transition-colors disabled:opacity-50"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>

              {/* Skip -10s */}
              {canControl && (
                <button
                  onClick={() => onSeek(Math.max(0, currentTime - 10))}
                  className="p-1.5 text-slate-300 hover:text-white transition-colors"
                  title="Skip -10s"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}

              {/* Skip +10s */}
              {canControl && (
                <button
                  onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                  className="p-1.5 text-slate-300 hover:text-white transition-colors"
                  title="Skip +10s"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              )}

              {/* Volume Slider */}
              <div className="flex items-center gap-2 group/vol">
                <button onClick={toggleMute} className="p-1.5 text-slate-300 hover:text-white">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-netflix-red" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Time Display */}
              <div className="text-xs font-mono text-slate-300 pl-2">
                <span>{formatTime(currentTime)}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-3">
              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-slate-300 hover:text-white transition-colors"
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
