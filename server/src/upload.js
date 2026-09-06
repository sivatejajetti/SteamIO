const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const uniqueId = crypto.randomBytes(8).toString('hex');
    cb(null, `vid_${Date.now()}_${uniqueId}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/') || file.originalname.match(/\.(mp4|mkv|webm|mov|avi|ogv)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files (MP4, WEBM, MKV, MOV, AVI) are supported.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1000 // 1GB limit
  }
});

module.exports = { upload, uploadDir };
