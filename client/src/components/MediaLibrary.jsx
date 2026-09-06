import React, { useState, useEffect, useCallback } from 'react';
import { Film, PlayCircle, Trash2, Clock, HardDrive, User, RefreshCw, FolderOpen, Cloud } from 'lucide-react';
import { SERVER_URL } from '../services/socket';

export default function MediaLibrary({ onSelectVideo, currentUser, canControl, addToast }) {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('all'); // 'all' or 'my'

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = filterMode === 'my' && currentUser
        ? `${SERVER_URL}/api/library?username=${encodeURIComponent(currentUser)}`
        : `${SERVER_URL}/api/library`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setVideos(data.videos || []);
      } else {
        addToast?.(data.error || 'Failed to fetch saved media library', 'error');
      }
    } catch (err) {
      addToast?.('Failed to connect to media library server', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filterMode, currentUser, addToast]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleDelete = async (videoId, videoName) => {
    if (!confirm(`Delete "${videoName}" permanently from the server library?`)) return;

    try {
      const res = await fetch(`${SERVER_URL}/api/library/${videoId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        addToast?.('Video deleted from library', 'info');
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
      } else {
        addToast?.(data.error || 'Failed to delete video', 'error');
      }
    } catch (err) {
      addToast?.('Failed to delete video', 'error');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-netflix-red" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Saved Account Media Library
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex p-0.5 bg-black/60 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-netflix-red text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Library ({videos.length})
            </button>
            <button
              onClick={() => setFilterMode('my')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                filterMode === 'my'
                  ? 'bg-netflix-red text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Uploads
            </button>
          </div>

          <button
            onClick={fetchLibrary}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Refresh Library"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Videos List Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-netflix-red" />
          <span>Loading saved media library...</span>
        </div>
      ) : videos.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-2 border border-slate-800/80">
          <Film className="w-10 h-10 mx-auto text-slate-600 stroke-1" />
          <p className="text-sm font-semibold text-white">No saved videos found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Videos you upload are automatically saved to your account library so you can stream them anytime, even after closing room sessions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {videos.map((video) => (
            <div
              key={video.id}
              className="glass-panel p-4 rounded-2xl border border-slate-800/80 hover:border-slate-600 transition-all flex flex-col justify-between group space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                  video.isGoogleDrive
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                    : 'bg-netflix-red/10 border border-netflix-red/30 text-netflix-red'
                }`}>
                  {video.isGoogleDrive ? <Cloud className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-white truncate" title={video.originalName}>
                    {video.originalName}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {video.uploadedBy || 'Host'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {video.isGoogleDrive ? (
                        <span className="text-blue-400 font-semibold">Google Drive</span>
                      ) : (
                        <>
                          <HardDrive className="w-3 h-3 text-slate-500" />
                          {(video.size / (1024 * 1024)).toFixed(1)} MB
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {formatDate(video.uploadedAt)}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDelete(video.id, video.originalName)}
                    className="p-1.5 text-slate-400 hover:text-netflix-red hover:bg-netflix-red/10 rounded-lg transition-colors"
                    title="Delete Video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectVideo(video)}
                    disabled={!canControl}
                    className="px-3 py-1.5 bg-netflix-red hover:bg-netflix-darkRed disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-netflix-red/20"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    Select
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
