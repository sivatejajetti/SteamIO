const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const libraryFile = path.join(dataDir, 'library.json');
const uploadDir = path.join(__dirname, '..', 'uploads');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure library.json exists
if (!fs.existsSync(libraryFile)) {
  fs.writeFileSync(libraryFile, JSON.stringify([]), 'utf8');
}

class MediaLibraryManager {
  readLibrary() {
    try {
      const data = fs.readFileSync(libraryFile, 'utf8');
      return JSON.parse(data) || [];
    } catch (err) {
      console.error('Error reading library.json:', err);
      return [];
    }
  }

  writeLibrary(items) {
    try {
      fs.writeFileSync(libraryFile, JSON.stringify(items, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing library.json:', err);
    }
  }

  getAllVideos(usernameFilter = null) {
    const library = this.readLibrary();
    if (usernameFilter && usernameFilter.trim()) {
      const filterLower = usernameFilter.trim().toLowerCase();
      return library.filter((v) => v.uploadedBy && v.uploadedBy.toLowerCase() === filterLower);
    }
    return library;
  }

  addVideo(videoInfo) {
    const library = this.readLibrary();
    // Check if video with same ID already exists
    const index = library.findIndex((v) => v.id === videoInfo.id);
    if (index !== -1) {
      library[index] = { ...library[index], ...videoInfo };
    } else {
      library.unshift(videoInfo); // Put newest first
    }
    this.writeLibrary(library);
    return videoInfo;
  }

  deleteVideo(videoId) {
    const library = this.readLibrary();
    const video = library.find((v) => v.id === videoId);

    if (!video) {
      return { error: 'Video not found in library' };
    }

    // Delete physical file from uploads directory
    const filePath = path.join(uploadDir, path.basename(video.filename || video.id));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete video file:', err);
      }
    }

    const updatedLibrary = library.filter((v) => v.id !== videoId);
    this.writeLibrary(updatedLibrary);

    return { success: true, deletedId: videoId };
  }
}

module.exports = new MediaLibraryManager();
