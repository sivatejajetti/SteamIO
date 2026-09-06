import React, { useState, useRef } from 'react';
import { Upload, Film, FileVideo, AlertCircle, CheckCircle2, Loader2, FolderOpen } from 'lucide-react';
import { SERVER_URL } from '../services/socket';
import MediaLibrary from './MediaLibrary';

export default function VideoUploader({ onVideoUploaded, isHost, canControl, currentUser, addToast }) {
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'upload'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mkv|webm|mov|avi|ogv)$/i)) {
      addToast?.('Please select a valid video file (MP4, WEBM, MKV, MOV, AVI).', 'error');
      return;
    }

    if (!canControl) {
      addToast?.('Only the host can upload or change room video.', 'warning');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('uploadedBy', currentUser || 'Host');

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${SERVER_URL}/api/videos/upload`, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          addToast?.(`Uploaded and saved "${file.name}" to your library!`, 'success');
          onVideoUploaded(data.video);
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            addToast?.(errData.error || 'Failed to upload video', 'error');
          } catch {
            addToast?.('Failed to upload video', 'error');
          }
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        addToast?.('Network error during video upload', 'error');
      };

      xhr.send(formData);
    } catch (err) {
      setIsUploading(false);
      addToast?.('Failed to initiate video upload', 'error');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Navigation Tabs */}
      <div className="flex p-1 bg-black/60 rounded-2xl border border-slate-800 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'library'
              ? 'bg-netflix-red text-white shadow-lg shadow-netflix-red/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Saved Library
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'upload'
              ? 'bg-netflix-red text-white shadow-lg shadow-netflix-red/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload New Video
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'library' ? (
        <MediaLibrary
          onSelectVideo={onVideoUploaded}
          currentUser={currentUser}
          canControl={canControl}
          addToast={addToast}
        />
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`glass-panel p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center space-y-4 ${
            dragActive
              ? 'border-netflix-red bg-netflix-red/10 scale-[1.01]'
              : 'border-slate-700/80 hover:border-slate-500 bg-black/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mkv,.mp4,.webm,.mov,.avi"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />

          <div className="w-16 h-16 mx-auto rounded-2xl bg-netflix-red/10 border border-netflix-red/30 flex items-center justify-center text-netflix-red shadow-lg shadow-netflix-red/20">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {isUploading ? 'Uploading & Saving Video to Account...' : 'Select or Drag New Video File'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload MP4, WEBM, or MKV files. Videos will be saved to your account library so you can stream them anytime!
            </p>
          </div>

          {isUploading && (
            <div className="w-full max-w-md mx-auto space-y-2 pt-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Uploading video stream</span>
                <span className="font-mono text-netflix-red">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-netflix-red to-rose-500 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {!isUploading && (
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-netflix-red hover:bg-netflix-darkRed text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-netflix-red/20">
                <FileVideo className="w-4 h-4" />
                Browse Local File
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
