import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, requireRole } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for video files only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  }
});

// Create router factory
const createVideoRouter = (videoController) => {
  const router = express.Router();

  // Upload video (requires authentication, editor or admin role)
  router.post('/upload', authenticate, requireRole('editor', 'admin'), upload.single('video'), videoController.uploadVideo);

  // Get all videos with filtering (requires authentication)
  router.get('/', authenticate, videoController.getVideos);

  // Get statistics (requires authentication)
  router.get('/stats', authenticate, videoController.getStats);

  // Get single video details (requires authentication)
  router.get('/:id', authenticate, videoController.getVideoById);

  // Stream video (requires authentication)
  router.get('/:id/stream', authenticate, videoController.streamVideo);

  // Get video frames (requires authentication)
  router.get('/:id/frames', authenticate, videoController.getVideoFrames);

  // Update video metadata (requires authentication, editor or admin role)
  router.put('/:id', authenticate, requireRole('editor', 'admin'), videoController.updateVideo);

  // Delete video (requires authentication, editor or admin role)
  router.delete('/:id', authenticate, requireRole('editor', 'admin'), videoController.deleteVideo);

  return router;
};

export default createVideoRouter;
