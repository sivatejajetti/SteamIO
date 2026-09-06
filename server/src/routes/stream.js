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

const https = require('https');

// Helper to follow HTTPS redirects for Google Drive video proxying
function fetchDriveStreamWithRedirects(targetUrl, headers, res, maxRedirects = 5) {
  if (maxRedirects === 0) {
    return res.status(500).json({ error: 'Too many redirects while fetching Google Drive video' });
  }

  const req = https.get(targetUrl, { headers }, (googleRes) => {
    // Handle HTTP Redirects (301, 302, 303, 307)
    if (googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
      return fetchDriveStreamWithRedirects(googleRes.headers.location, headers, res, maxRedirects - 1);
    }

    const contentType = googleRes.headers['content-type'] || 'video/mp4';

    const responseHeaders = {
      'Content-Type': contentType.includes('html') ? 'video/mp4' : contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };

    if (googleRes.headers['content-length']) {
      responseHeaders['Content-Length'] = googleRes.headers['content-length'];
    }
    if (googleRes.headers['content-range']) {
      responseHeaders['Content-Range'] = googleRes.headers['content-range'];
    }

    res.writeHead(googleRes.statusCode === 200 || googleRes.statusCode === 206 ? googleRes.statusCode : 200, responseHeaders);
    googleRes.pipe(res);
  });

  req.on('error', (err) => {
    console.error('Error proxying Google Drive stream:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream Google Drive video' });
    }
  });
}

// GET /api/videos/drive-proxy/:driveId
router.get('/drive-proxy/:driveId', (req, res) => {
  try {
    const driveId = req.params.driveId;
    const targetUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${driveId}`;

    const forwardHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (req.headers.range) {
      forwardHeaders['Range'] = req.headers.range;
    }

    fetchDriveStreamWithRedirects(targetUrl, forwardHeaders, res);
  } catch (err) {
    console.error('Drive proxy error:', err);
    res.status(500).json({ error: 'Failed to proxy Google Drive video' });
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
