const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { uploadDir } = require('../upload');

// Map extensions to mime types
const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.ogv': 'video/ogg'
};

// GET /api/videos/stream/:filename
router.get('/stream/:filename', (req, res) => {
  try {
    const rawFilename = req.params.filename;
    // Prevent path traversal
    const safeFilename = path.basename(rawFilename);
    const filePath = path.join(uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'video/mp4';

    if (range) {
      // Range header format: "bytes=0-1000"
      const parts = range.replace(/bytes=/, '').split('-');
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start)) start = 0;
      if (isNaN(end) || end >= fileSize) end = fileSize - 1;

      if (start >= fileSize || start > end) {
        res.status(416).header('Content-Range', `bytes */${fileSize}`);
        return res.status(416).json({ error: 'Requested range not satisfiable' });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      };

      res.writeHead(206, headers);
      fileStream.pipe(res);
    } else {
      const headers = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      };

      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Error streaming video:', err);
    res.status(500).json({ error: 'Internal server error while streaming video' });
  }
});

// GET /api/videos/info/:filename
router.get('/info/:filename', (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();

    res.json({
      filename: safeFilename,
      size: stat.size,
      mimeType: MIME_TYPES[ext] || 'video/mp4'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve video metadata' });
  }
});

module.exports = router;
