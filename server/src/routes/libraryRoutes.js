const express = require('express');
const router = express.Router();
const mediaLibrary = require('../library');

// GET /api/library?username=Alex
router.get('/', (req, res) => {
  try {
    const username = req.query.username;
    const videos = mediaLibrary.getAllVideos(username);
    res.json({ videos });
  } catch (err) {
    console.error('Error fetching library:', err);
    res.status(500).json({ error: 'Failed to retrieve media library' });
  }
});

// POST /api/library/drive - Register Google Drive or direct video URL
router.post('/drive', (req, res) => {
  try {
    const { originalName, url, streamUrl, uploadedBy, isGoogleDrive, driveId } = req.body;

    if (!url || !streamUrl) {
      return res.status(400).json({ error: 'Video URL and stream URL are required' });
    }

    const cleanTitle = originalName?.trim() || (isGoogleDrive ? `Google Drive Video (${driveId})` : 'Shared Video Link');

    const videoInfo = {
      id: `drive_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      filename: cleanTitle,
      originalName: cleanTitle,
      mimeType: 'video/mp4',
      size: 0,
      url: streamUrl,
      sourceUrl: url,
      isGoogleDrive: Boolean(isGoogleDrive),
      driveId: driveId || null,
      uploadedBy: uploadedBy?.trim() || 'Host',
      uploadedAt: Date.now()
    };

    mediaLibrary.addVideo(videoInfo);

    console.log(`[Drive] Saved Google Drive link to library for ${videoInfo.uploadedBy}: ${cleanTitle}`);

    res.status(200).json({
      message: 'Google Drive video link saved to library',
      video: videoInfo
    });
  } catch (err) {
    console.error('Error saving Google Drive video link:', err);
    res.status(500).json({ error: 'Failed to save Google Drive video link' });
  }
});

// DELETE /api/library/:id
router.delete('/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    const result = mediaLibrary.deleteVideo(videoId);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.json({ message: 'Video removed from library', deletedId: result.deletedId });
  } catch (err) {
    console.error('Error deleting video from library:', err);
    res.status(500).json({ error: 'Failed to delete video from library' });
  }
});

module.exports = router;
