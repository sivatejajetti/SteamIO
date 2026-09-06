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
