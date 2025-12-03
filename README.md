# Pulse Video Backend

A comprehensive video upload, processing, and streaming API with real-time progress tracking.

## 🚀 Backend Features

### Video Management
- **Video Upload** - Upload videos with metadata (title, description)
- **Video Streaming** - HTTP range requests support for efficient video playback and seeking
- **CRUD Operations** - Complete create, read, update, delete functionality for videos
- **Advanced Filtering** - Filter videos by status, sensitivity flag, and search queries
- **Pagination** - Efficient data retrieval with customizable page size
- **Statistics Dashboard** - Get comprehensive video statistics and analytics

### Video Processing
- **Automated Processing** - Background video processing using FFmpeg
- **Metadata Extraction** - Automatic extraction of duration, resolution, codec, fps, and bitrate
- **Sensitivity Analysis** - Content analysis for flagging potentially sensitive material
- **Progress Tracking** - Real-time progress updates during processing

### Real-time Communication
- **Socket.io Integration** - Real-time bidirectional communication
- **Live Progress Updates** - Instant processing progress notifications
- **Event Broadcasting** - Processing status updates (pending, processing, completed, failed)
- **Video Subscriptions** - Subscribe to specific video processing updates

### Authentication & Security
- **JWT Authentication** - Secure token-based authentication system
- **User Registration** - User signup with validation
- **User Login** - Secure login with password hashing
- **Protected Routes** - Middleware-based route protection
- **CORS Configuration** - Secure cross-origin resource sharing

### Database & Storage
- **MongoDB Integration** - NoSQL database for flexible data storage
- **File System Storage** - Local file storage for uploaded videos
- **Video Metadata** - Comprehensive video information storage
- **User Management** - User account and profile data management

### API Architecture
- **RESTful Design** - Standard REST API conventions
- **Express.js Framework** - Fast and minimalist web framework
- **Multer File Upload** - Efficient multipart/form-data handling
- **Error Handling** - Comprehensive error responses and logging
- **Environment Configuration** - Flexible environment-based settings
