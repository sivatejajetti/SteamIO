const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { upload } = require('./upload');
const mediaLibrary = require('./library');
const streamRoutes = require('./routes/stream');
const libraryRoutes = require('./routes/libraryRoutes');
const setupSocketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all local & network connections
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // 10MB socket buffer
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter for general HTTP endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

app.use('/api/', apiLimiter);

// Stream routes (range requests)
app.use('/api/videos', streamRoutes);

// Media Library routes
app.use('/api/library', libraryRoutes);

// Video Upload Endpoint
app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    const file = req.file;
    const protocol = req.protocol;
    const host = req.get('host');
    const streamUrl = `${protocol}://${host}/api/videos/stream/${file.filename}`;
    const uploadedBy = req.body.uploadedBy?.trim() || 'Host';

    const videoInfo = {
      id: file.filename,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: streamUrl,
      uploadedBy,
      uploadedAt: Date.now()
    };

    // Save to persistent media library
    mediaLibrary.addVideo(videoInfo);

    console.log(`[Upload] Video saved to library for ${uploadedBy}: ${file.originalname}`);

    res.status(200).json({
      message: 'Video uploaded and saved to account library',
      video: videoInfo
    });
  } catch (err) {
    console.error('Error uploading video:', err);
    res.status(500).json({ error: err.message || 'Failed to upload video' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Express global error handling middleware
app.use((err, req, res, next) => {
  console.error('[Express Error]:', err.message);
  res.status(err.status || 400).json({
    error: err.message || 'An error occurred on the server.'
  });
});

// Initialize Socket.IO handlers
setupSocketHandlers(io);

// Start server on 0.0.0.0 to enable local Wi-Fi / network access
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🎬 Watch Together Server is running on port ${PORT}`);
  console.log(`   Local URL:   http://localhost:${PORT}`);
  console.log(`   Network URL: http://0.0.0.0:${PORT}`);
  console.log(`=======================================================`);
});
