import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import connectDB from './config/database.js';
import createVideoRouter from './routes/videoRoutes.js';
import authRoutes from './routes/authRoutes.js';
import VideoController from './controllers/videoController.js';
import VideoProcessor from './utils/videoProcessor.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();


const videoProcessor = new VideoProcessor(io);

// Initialize video controller
const videoController = new VideoController(videoProcessor);


app.get('/', (req, res) => {
  res.json({ 
    message: 'Pulse Video API is working',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/profile'
      },
      videos: {
        list: 'GET /api/videos',
        upload: 'POST /api/videos/upload',
        details: 'GET /api/videos/:id',
        stream: 'GET /api/videos/:id/stream',
        update: 'PUT /api/videos/:id',
        delete: 'DELETE /api/videos/:id',
        stats: 'GET /api/videos/stats'
      }
    }
  });
});


app.use('/api/auth', authRoutes);


app.use('/api/videos', createVideoRouter(videoController));


io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('subscribe-video', (videoId) => {
    socket.join(`video-${videoId}`);
    console.log(`Client ${socket.id} subscribed to video ${videoId}`);
  });

  socket.on('unsubscribe-video', (videoId) => {
    socket.leave(`video-${videoId}`);
    console.log(`Client ${socket.id} unsubscribed from video ${videoId}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Maximum size is 500MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
