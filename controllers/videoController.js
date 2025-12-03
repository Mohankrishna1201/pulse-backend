import Video from '../models/Video.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VideoController {
  constructor(videoProcessor) {
    this.videoProcessor = videoProcessor;
  }

  // Upload video
  uploadVideo = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
      }

      const { title } = req.body;

      if (!title) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Video title is required' });
      }

      // Get authenticated user (from middleware)
      const userId = req.user._id;
      const organization = req.user.organization;

      // Create video record in database
      const video = new Video({
        title,
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype,
        status: 'pending',
        userId,
        organization
      });

      await video.save();

      // Start processing in background (non-blocking)
      setImmediate(() => {
        this.videoProcessor.processVideo(req.file.path, video._id, Video)
          .catch(err => console.error('Background processing error:', err));
      });

      res.status(201).json({
        message: 'Video uploaded successfully and processing started',
        video: {
          id: video._id,
          title: video.title,
          filename: video.filename,
          size: video.size,
          status: video.status,
          uploadDate: video.uploadDate,
          userId: video.userId,
          organization: video.organization
        }
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up file if it was uploaded
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
      
      res.status(500).json({ error: 'Failed to upload video', details: error.message });
    }
  };

  // Get all videos with filtering and pagination
  getVideos = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        sensitivityFlag,
        search,
        sortBy = 'uploadDate',
        order = 'desc'
      } = req.query;

      // Build query with multi-tenant isolation (by organization)
      const query = {};
      
      // Multi-tenant: Users see only videos from their organization, admins see all
      if (req.user.role !== 'admin') {
        query.organization = req.user.organization;
      }

      // Apply filters
      if (status) query.status = status;
      if (sensitivityFlag) query.sensitivityFlag = sensitivityFlag;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { originalName: { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate skip for pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build sort object
      const sort = {};
      sort[sortBy] = order === 'asc' ? 1 : -1;

      // Execute query
      const videos = await Video.find(query)
        .populate('userId', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-path'); // Don't expose file path

      const total = await Video.countDocuments(query);

      res.json({
        videos,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalVideos: total,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Get videos error:', error);
      res.status(500).json({ error: 'Failed to fetch videos', details: error.message });
    }
  };

  // Get single video details
  getVideoById = async (req, res) => {
    try {
      const { id } = req.params;

      const video = await Video.findById(id)
        .populate('userId', 'username email')
        .select('-path');

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Multi-tenant: Check if user has access to this video
      if (req.user.role !== 'admin' && video.userId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied. You can only view your own videos.' });
      }

      res.json({ video });

    } catch (error) {
      console.error('Get video error:', error);
      res.status(500).json({ error: 'Failed to fetch video', details: error.message });
    }
  };

  // Stream video with range support
  streamVideo = async (req, res) => {
    try {
      const { id } = req.params;

      const video = await Video.findById(id);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Multi-tenant: Check if user has access to this video
      if (req.user.role !== 'admin' && video.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied. You can only stream your own videos.' });
      }

      if (video.status !== 'completed') {
        return res.status(400).json({ 
          error: 'Video is not ready for streaming',
          status: video.status 
        });
      }

      const videoPath = video.path;
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': video.mimeType || 'video/mp4',
        };

        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // No range request - send entire file
        const head = {
          'Content-Length': fileSize,
          'Content-Type': video.mimeType || 'video/mp4',
        };
        
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }

    } catch (error) {
      console.error('Stream video error:', error);
      res.status(500).json({ error: 'Failed to stream video', details: error.message });
    }
  };

  // Get video frames
  getVideoFrames = async (req, res) => {
    try {
      const { id } = req.params;

      const video = await Video.findById(id);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Multi-tenant: Check if user has access to this video
      if (req.user.role !== 'admin' && video.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      // Check if frames directory exists
      const framesDir = path.join('uploads', 'frames', id.toString());
      
      if (!fs.existsSync(framesDir)) {
        return res.status(404).json({ 
          error: 'Frames not found',
          message: 'Video frames have not been extracted yet or were deleted.'
        });
      }

      // Read all frame files
      const frameFiles = fs.readdirSync(framesDir)
        .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
        .sort();

      // Convert frames to base64 for easy frontend consumption
      const frames = frameFiles.map((filename, index) => {
        const framePath = path.join(framesDir, filename);
        const frameBuffer = fs.readFileSync(framePath);
        const base64 = frameBuffer.toString('base64');
        
        return {
          id: index + 1,
          filename,
          data: `data:image/jpeg;base64,${base64}`
        };
      });

      res.json({
        videoId: id,
        totalFrames: frames.length,
        frames
      });

    } catch (error) {
      console.error('Get frames error:', error);
      res.status(500).json({ error: 'Failed to get frames', details: error.message });
    }
  };

  // Update video metadata
  updateVideo = async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const video = await Video.findById(id);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Multi-tenant: Check if user has access to update this video
      // Only editors/admins can update, and they must own the video (unless admin)
      if (req.user.role === 'viewer') {
        return res.status(403).json({ error: 'Viewers cannot edit videos' });
      }

      if (req.user.role !== 'admin' && video.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied. You can only update your own videos.' });
      }

      video.title = title;
      await video.save();

      res.json({
        message: 'Video updated successfully',
        video: {
          id: video._id,
          title: video.title,
          status: video.status,
          sensitivityFlag: video.sensitivityFlag
        }
      });

    } catch (error) {
      console.error('Update video error:', error);
      res.status(500).json({ error: 'Failed to update video', details: error.message });
    }
  };

  // Delete video
  deleteVideo = async (req, res) => {
    try {
      const { id } = req.params;

      const video = await Video.findById(id);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Multi-tenant: Check if user has access to delete this video
      // Only editors/admins can delete, and they must own the video (unless admin)
      if (req.user.role === 'viewer') {
        return res.status(403).json({ error: 'Viewers cannot delete videos' });
      }

      if (req.user.role !== 'admin' && video.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied. You can only delete your own videos.' });
      }

      // Delete file from filesystem
      if (fs.existsSync(video.path)) {
        fs.unlinkSync(video.path);
      }

      // Delete from database
      await Video.findByIdAndDelete(id);

      res.json({
        message: 'Video deleted successfully',
        deletedVideoId: id
      });

    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({ error: 'Failed to delete video', details: error.message });
    }
  };

  // Get processing statistics
  getStats = async (req, res) => {
    try {
      // Multi-tenant: Filter by organization (tenant)
      const matchCriteria = {};
      if (req.user.role !== 'admin') {
        matchCriteria.organization = req.user.organization;
      }

      const stats = await Video.aggregate([
        { $match: matchCriteria },
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            processing: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
            },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            safe: {
              $sum: { $cond: [{ $eq: ['$sensitivityFlag', 'safe'] }, 1, 0] }
            },
            flagged: {
              $sum: { $cond: [{ $eq: ['$sensitivityFlag', 'flagged'] }, 1, 0] }
            },
            totalSize: { $sum: '$size' }
          }
        }
      ]);

      res.json({
        stats: stats[0] || {
          totalVideos: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          safe: 0,
          flagged: 0,
          totalSize: 0
        },
        organization: req.user.role === 'admin' ? 'all' : req.user.organization
      });

    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
    }
  };
}

export default VideoController;
