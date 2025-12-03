# Pulse Video Backend API

A comprehensive video upload, processing, and streaming API with AI-powered content moderation, real-time progress tracking, and multi-tenant organization support.

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation & Setup](#installation--setup)
5. [API Documentation](#api-documentation)
6. [User Manual](#user-manual)
7. [Design Decisions](#design-decisions)
8. [Deployment](#deployment)

---

## 🎯 Overview

Pulse Backend is a Node.js/Express API that powers a video content moderation platform. It provides secure video upload, AI-based sensitivity analysis using Hugging Face models, real-time WebSocket updates, and multi-tenant organization isolation.

### Key Capabilities
- 🎥 Video upload with automatic processing
- 🤖 AI-powered NSFW content detection
- 🎬 HTTP range request video streaming
- 🔒 JWT authentication with role-based access control
- 🏢 Multi-tenant organization isolation
- ⚡ Real-time processing updates via Socket.io
- 📊 Analytics and statistics dashboard

---

## ✨ Features

### Video Management
- **Video Upload** - Multipart form-data upload with Multer
- **Video Streaming** - HTTP range requests for efficient seeking/playback
- **CRUD Operations** - Complete video lifecycle management
- **Advanced Filtering** - Filter by status, sensitivity, organization, search
- **Pagination** - Efficient data retrieval with customizable limits
- **Statistics Dashboard** - Real-time video analytics per organization

### AI Video Processing
- **Automated Processing** - Background FFmpeg processing pipeline
- **Frame Extraction** - Extract 5 frames at different timestamps
- **AI Sensitivity Analysis** - Hugging Face `Falconsai/nsfw_image_detection` model
- **Metadata Extraction** - Duration, resolution, codec, fps, bitrate
- **Confidence Scoring** - Detailed AI confidence metrics
- **Frame Persistence** - Extracted frames stored for review

### Real-time Communication
- **Socket.io Integration** - Bidirectional WebSocket communication
- **Live Progress Updates** - Real-time processing status (0-100%)
- **Event Broadcasting** - `video-processing-progress`, `video-processing-complete`, `video-processing-error`
- **Client Subscriptions** - Subscribe to specific video updates

### Authentication & Security
- **JWT Authentication** - Secure token-based auth (7-day expiry)
- **Password Hashing** - bcrypt with salt rounds
- **Role-Based Access Control** - Admin, Editor, Viewer roles
- **Multi-Tenant Isolation** - Organization-based data segregation
- **Protected Routes** - Middleware authentication on all sensitive endpoints
- **CORS Configuration** - Secure cross-origin resource sharing

### Database & Storage
- **MongoDB Integration** - Mongoose ODM with schema validation
- **File System Storage** - Local uploads directory (use S3 for production)
- **Video Metadata Schema** - Comprehensive video document structure
- **User Management Schema** - User accounts with organization linkage

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (React)                          │
│  - Video Upload UI                                           │
│  - Real-time Progress                                        │
│  - Video Player                                              │
└────────────┬────────────────────────────┬───────────────────┘
             │ HTTP/REST                  │ WebSocket
             ▼                            ▼
┌────────────────────────────────────────────────────────────┐
│               EXPRESS.JS API SERVER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Auth Routes  │  │ Video Routes │  │ Socket.io       │  │
│  │              │  │              │  │ Event Handler   │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│         │                  │                   │            │
│  ┌──────▼──────────────────▼───────────────────▼────────┐  │
│  │           VideoController & VideoProcessor           │  │
│  │  - Upload handling        - FFmpeg processing        │  │
│  │  - CRUD operations        - AI analysis              │  │
│  │  - Stream management      - Frame extraction         │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────┬────────────────────────────┬──────────────────┘
             │                            │
             ▼                            ▼
┌────────────────────────┐    ┌─────────────────────────────┐
│   MongoDB Database     │    │   File System / Storage     │
│                        │    │                             │
│  - Users Collection    │    │  - uploads/videos/          │
│  - Videos Collection   │    │  - uploads/frames/{id}/     │
│  - Organizations       │    │  - uploads/temp/            │
└────────────────────────┘    └─────────────────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────────┐
                              │   External Services         │
                              │                             │
                              │  - Hugging Face API         │
                              │  - FFmpeg (system binary)   │
                              └─────────────────────────────┘
```

### Component Breakdown

#### 1. **API Layer** (`index.js`)
- Express server initialization
- Socket.io configuration
- Middleware setup (CORS, JSON, multer)
- Route mounting
- Error handling

#### 2. **Authentication Flow** (`middleware/auth.js`)
- JWT token verification (header or query param)
- User session validation
- Role-based access checks
- Token expiry handling

#### 3. **Video Controller** (`controllers/videoController.js`)
- `uploadVideo()` - Handle multipart upload, create DB record
- `getVideos()` - List videos with filters/pagination/search
- `getVideoById()` - Fetch single video details
- `streamVideo()` - Stream video with HTTP range support
- `deleteVideo()` - Delete video file and DB record
- `getStats()` - Organization-specific analytics
- `getVideoFrames()` - Retrieve extracted frame images

#### 4. **Video Processor** (`utils/videoProcessor.js`)
- `processVideo()` - Main processing orchestrator
- `getVideoMetadata()` - Extract video properties via FFmpeg
- `extractFrames()` - Capture 5 frames using FFmpeg screenshots
- `analyzeSensitivity()` - Send frames to Hugging Face AI API
- `callHuggingFaceAPI()` - REST API call to NSFW detection model
- Real-time Socket.io progress emission

#### 5. **Database Models**
- **User** (`models/User.js`): username, email, password, role, organization, isActive
- **Video** (`models/Video.js`): title, filename, path, size, status, sensitivityFlag, metadata, userId, organization

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** 18+ and npm
- **MongoDB** 5.0+ (local or cloud like MongoDB Atlas)
- **FFmpeg** installed and in system PATH
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Linux: `sudo apt install ffmpeg`
  - macOS: `brew install ffmpeg`
- **Hugging Face API Key** (free tier available at [huggingface.co](https://huggingface.co/))

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/Mohankrishna1201/pulse-backend.git
cd pulse-backend
```

#### 2. Install Dependencies
```bash
npm install
```

Installs:
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `socket.io` - WebSocket library
- `jsonwebtoken` - JWT auth
- `bcryptjs` - Password hashing
- `multer` - File upload handling
- `fluent-ffmpeg` - FFmpeg wrapper
- `axios` - HTTP client
- `@huggingface/inference` - Hugging Face API client
- `dotenv` - Environment variables
- `cors` - CORS middleware

#### 3. Configure Environment Variables
Create `.env` file in root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/pulse
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pulse

# Authentication
JWT_SECRET=your_super_secret_jwt_key_min_32_characters

# Hugging Face API
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx

# Frontend CORS
FRONTEND_URL=http://localhost:5173

# FFmpeg Paths (optional - leave blank to use system PATH)
FFMPEG_PATH=
FFPROBE_PATH=
```

#### 4. Start MongoDB
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas cloud connection (no local server needed)
```

#### 5. Run the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will start on `http://localhost:3000`

#### 6. Verify Installation
Test the API:
```bash
curl http://localhost:3000/api/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"12345678","organization":"testorg"}'
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
All protected routes require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

For video streaming, token can be in query parameter:
```
GET /api/videos/:id/stream?token=<token>
```

---

### 🔐 Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "organization": "acme-corp",
  "role": "user"  // Optional: "admin", "editor", "viewer" (default: "user")
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "organization": "acme-corp"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "organization": "acme-corp"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user",
    "organization": "acme-corp",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "john_updated",
  "email": "newemail@example.com"
}
```

#### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

#### Get All Users (Admin Only)
```http
GET /api/auth/users
Authorization: Bearer <admin_token>
```

#### Update User Role (Admin Only)
```http
PATCH /api/auth/users/:userId/role
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "admin"  // "admin", "editor", "viewer", "user"
}
```

---

### 🎥 Video Endpoints

#### Upload Video
```http
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Fields:
- video: <file>          (required)
- title: "Video Title"   (required)
```

**Response (201):**
```json
{
  "message": "Video uploaded successfully and processing started",
  "video": {
    "id": "692fdb2ec311c36b0beeee36",
    "title": "My Video",
    "filename": "video-1764743214-123456.mp4",
    "size": 15728640,
    "status": "pending",
    "uploadDate": "2025-01-02T10:30:00.000Z",
    "userId": "507f1f77bcf86cd799439011",
    "organization": "acme-corp"
  }
}
```

#### Get Videos (with filters)
```http
GET /api/videos?page=1&limit=10&status=completed&sensitivityFlag=safe&search=keyword&sortBy=uploadDate&order=desc
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10) - Items per page
- `status` - Filter: `pending`, `processing`, `completed`, `failed`
- `sensitivityFlag` - Filter: `safe`, `flagged`
- `search` - Search in title/filename
- `sortBy` (default: `uploadDate`) - Sort field
- `order` (default: `desc`) - Sort order: `asc` or `desc`

**Response (200):**
```json
{
  "videos": [
    {
      "_id": "692fdb2ec311c36b0beeee36",
      "title": "My Video",
      "filename": "video-1764743214-123456.mp4",
      "originalName": "original_video.mp4",
      "size": 15728640,
      "mimeType": "video/mp4",
      "status": "completed",
      "sensitivityFlag": "safe",
      "metadata": {
        "duration": 120.5,
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "bitrate": 5000000,
        "codec": "h264"
      },
      "uploadDate": "2025-01-02T10:30:00.000Z",
      "processedAt": "2025-01-02T10:35:00.000Z",
      "userId": {
        "username": "johndoe",
        "email": "john@example.com"
      },
      "organization": "acme-corp"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalVideos": 47,
    "limit": 10
  }
}
```

#### Get Video by ID
```http
GET /api/videos/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "video": {
    "_id": "692fdb2ec311c36b0beeee36",
    "title": "My Video",
    "filename": "video-1764743214-123456.mp4",
    "originalName": "original_video.mp4",
    "size": 15728640,
    "mimeType": "video/mp4",
    "status": "completed",
    "sensitivityFlag": "safe",
    "duration": 120.5,
    "metadata": {...},
    "uploadDate": "2025-01-02T10:30:00.000Z",
    "processedAt": "2025-01-02T10:35:00.000Z",
    "userId": {
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

#### Stream Video (HTTP Range Support)
```http
GET /api/videos/:id/stream
Authorization: Bearer <token>
Range: bytes=0-1048575
```

**Response (206 Partial Content):**
```
Content-Range: bytes 0-1048575/15728640
Accept-Ranges: bytes
Content-Length: 1048576
Content-Type: video/mp4

<binary video data>
```

**Or full video (200 OK)** if no Range header provided.

#### Get Video Frames
```http
GET /api/videos/:id/frames
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "videoId": "692fdb2ec311c36b0beeee36",
  "totalFrames": 5,
  "frames": [
    {
      "id": 1,
      "filename": "frame-1.jpg",
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    },
    {
      "id": 2,
      "filename": "frame-2.jpg",
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ]
}
```

#### Get Statistics
```http
GET /api/videos/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "stats": {
    "totalVideos": 47,
    "pending": 3,
    "processing": 2,
    "completed": 40,
    "failed": 2,
    "safe": 35,
    "flagged": 5,
    "totalSize": 2147483648
  },
  "organization": "acme-corp"
}
```

#### Delete Video
```http
DELETE /api/videos/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Video deleted successfully",
  "deletedVideoId": "692fdb2ec311c36b0beeee36"
}
```

---

### 🔌 WebSocket Events (Socket.io)

Connect to WebSocket:
```javascript
const socket = io('http://localhost:3000');
```

#### Events Emitted by Server:

**1. video-processing-progress**
```javascript
{
  videoId: "692fdb2ec311c36b0beeee36",
  progress: 45,  // 0-100
  stage: "Analyzing frame 3/5 with AI...",
  status: "processing"
}
```

**2. video-processing-complete**
```javascript
{
  videoId: "692fdb2ec311c36b0beeee36",
  status: "completed",
  sensitivityFlag: "safe",  // or "flagged"
  confidence: 0.92,
  detectedIssues: [],  // or ["Frame 3: High sensitivity content detected (85% confidence)"]
  details: {
    totalFramesAnalyzed: 5,
    successfulAnalyses: 5,
    flaggedFrames: 0,
    averageNsfwScore: 0.08,
    model: "Falconsai/nsfw_image_detection",
    duration: 120.5,
    resolution: "1920x1080",
    codec: "h264"
  },
  message: "✅ Video is SAFE (92% confidence)"
}
```

**3. video-processing-error**
```javascript
{
  videoId: "692fdb2ec311c36b0beeee36",
  status: "failed",
  error: "FFmpeg extraction failed"
}
```

---

## 📖 User Manual

### For End Users

#### 1. **Account Registration**
- Navigate to registration page
- Provide username, email, password, and organization name
- System creates account with default "user" role
- Receive JWT token for authentication

#### 2. **Upload a Video**
- Login to get authentication token
- Use video upload endpoint with multipart form data
- Include video file and title
- Video enters "pending" status
- Background processing starts automatically

#### 3. **Monitor Processing**
- Connect WebSocket client to receive real-time updates
- Watch for `video-processing-progress` events (0-100%)
- Processing stages:
  - Extracting metadata (20%)
  - Extracting frames (25-30%)
  - Analyzing frames with AI (30-90%)
  - Finalizing (90-100%)
- Receive `video-processing-complete` or `video-processing-error`

#### 4. **View Video Results**
- Query videos list with filters
- View individual video details including:
  - AI sensitivity analysis results
  - Confidence scores
  - Extracted frames (if flagged)
  - Video metadata (duration, resolution, codec)
- Videos marked as "safe" or "flagged"

#### 5. **Stream/Download Videos**
- Use stream endpoint in video player
- Supports HTTP range requests for seeking
- Download by opening stream URL directly

#### 6. **Manage Profile**
- Update username/email via profile endpoint
- Change password securely
- View organization membership

### For Administrators

#### 1. **User Management**
- View all users in organization via `/api/auth/users`
- Update user roles (admin, editor, viewer, user)
- Monitor user video upload activity

#### 2. **Content Moderation**
- Review flagged videos
- Access extracted frames for manual review
- Delete inappropriate content
- View detailed AI analysis reports

#### 3. **Analytics**
- Access organization-wide statistics
- Monitor processing success/failure rates
- Track total storage usage
- Identify content trends (safe vs. flagged ratios)

#### 4. **Multi-Tenant Isolation**
- Admin of Organization A cannot access Organization B's data
- All queries automatically filtered by organization
- Statistics reflect only organization-specific data

---

## 🎨 Design Decisions & Assumptions

### Architecture Decisions

#### 1. **Multi-Tenant Strategy**
**Decision:** Organization-based isolation at database query level  
**Rationale:**
- Single database with query-level filtering more cost-effective than separate databases
- Easier to scale horizontally
- Simplified backup and maintenance
- All users (including admins) see only their organization's data

**Implementation:**
```javascript
// All video queries include organization filter
query.organization = req.user.organization;
```

#### 2. **Video Processing Pipeline**
**Decision:** Asynchronous background processing with Socket.io updates  
**Rationale:**
- Prevents HTTP timeout for long-running AI analysis
- Provides better UX with real-time progress
- Allows server to handle multiple concurrent uploads

**Implementation:**
```javascript
setImmediate(() => {
  this.videoProcessor.processVideo(path, videoId, Video)
    .catch(err => console.error('Processing error:', err));
});
```

#### 3. **Frame Extraction Count**
**Decision:** Extract 5 frames per video at different timestamps  
**Rationale:**
- Balances accuracy vs. processing time
- 5 frames provides statistical confidence
- Covers beginning, middle, and end of video
- Each frame analysis takes ~2-3 seconds

**Assumption:** Most inappropriate content appears in multiple frames

#### 4. **AI Model Selection**
**Decision:** Hugging Face `Falconsai/nsfw_image_detection` model  
**Rationale:**
- Free tier available
- Verified working model (tested December 2025)
- Binary classification (safe/nsfw)
- Confidence scoring built-in
- No local model hosting required

**Fallback:** Mock analysis if API unavailable (prevents upload blocking)

#### 5. **Sensitivity Threshold**
**Decision:** 
- Flag video if average NSFW score ≥ 50% OR any frame > 60%  
**Rationale:**
- 50% average: Conservative threshold for overall video
- 60% frame: Catches videos with brief inappropriate segments
- Lower threshold = fewer false negatives (better safety)
- Higher threshold = fewer false positives (better UX)

**Configurable:** Can be adjusted in `videoProcessor.js`

#### 6. **HTTP Range Request Streaming**
**Decision:** Implement full range request support for video streaming  
**Rationale:**
- Enables seek/skip functionality in video players
- Reduces bandwidth (only send requested chunks)
- Standard HTML5 `<video>` tag expects range support
- Improves mobile experience

**Implementation:**
```javascript
if (range) {
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  // ... send 206 Partial Content
}
```

#### 7. **JWT Token Expiry**
**Decision:** 7-day token expiry  
**Rationale:**
- Balance between security and UX
- Long enough for typical usage sessions
- Forces re-authentication periodically
- Can be refreshed on active usage

**Security:** Tokens stored in localStorage (XSS risk accepted for demo)

#### 8. **File Storage Strategy**
**Decision:** Local filesystem for development, S3/cloud for production  
**Rationale:**
- Simple local development setup
- Production requires persistent storage (Render filesystem is ephemeral)
- Easy migration path to S3/Cloudflare R2

**Assumption:** Production deployment will integrate cloud storage

#### 9. **Frame Persistence**
**Decision:** Keep extracted frames permanently in `uploads/frames/{videoId}/`  
**Rationale:**
- Allows manual review of flagged content
- Audit trail for content decisions
- No need to re-extract for review
- Disk space trade-off acceptable (5 images ~500KB vs. full video)

**Alternative:** Delete frames after analysis (uncomment cleanup code)

#### 10. **Role-Based Access Control**
**Decision:** Four roles - admin, editor, viewer, user  
**Rationale:**
- **Admin:** Full control within organization
- **Editor:** Upload and edit videos
- **Viewer:** Read-only access
- **User:** Standard upload and own-video management

**Implementation:** Middleware checks `req.user.role` before actions

### Assumptions

1. **Video Format Assumptions**
   - Most videos are MP4/H.264 (most common format)
   - FFmpeg can handle provided formats
   - Maximum video size controlled by multer configuration

2. **Network Assumptions**
   - Stable connection to Hugging Face API
   - Reasonable upload speeds (multi-GB videos may timeout)
   - Socket.io WebSocket connection maintained during processing

3. **Content Assumptions**
   - Inappropriate content visually detectable in frames
   - Audio analysis not required (image-based AI sufficient)
   - 5 frames representative of full video content

4. **Scalability Assumptions**
   - Single-server deployment adequate for MVP
   - MongoDB can handle query load
   - Video processing sequential (not parallel) acceptable

5. **Security Assumptions**
   - HTTPS handled by reverse proxy (Nginx/Render)
   - Rate limiting implemented at infrastructure level
   - DDoS protection via hosting provider

6. **Deployment Assumptions**
   - FFmpeg available in production environment
   - 512MB+ RAM for video processing
   - Persistent storage for production (not ephemeral filesystem)

### Known Limitations

1. **Video Size Limit:** Default 100MB (configurable in multer)
2. **Concurrent Processing:** Sequential (one video at a time per worker)
3. **AI Model:** Binary safe/unsafe only (no granular categories)
4. **Storage:** Local filesystem not production-ready
5. **Thumbnails:** Not auto-generated (only analysis frames)
6. **Video Formats:** Limited by FFmpeg codec support

---

## 🚀 Deployment

### Deploy to Render

1. **Create Render Account** at [render.com](https://render.com)

2. **Create Web Service**
   - Connect GitHub repository
   - Select `pulse-backend` directory
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Add Environment Variables**
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_secret_key
   HUGGINGFACE_API_KEY=hf_...
   FRONTEND_URL=https://your-frontend.com
   PORT=3000
   ```

4. **FFmpeg Auto-Install**
   - Render has FFmpeg pre-installed on Linux
   - No configuration needed (auto-detected)

5. **Persistent Storage**
   ⚠️ **Important:** Render's filesystem is ephemeral. Videos will be deleted on restart.
   
   **Solutions:**
   - Use Render Disks (paid persistent storage)
   - Integrate AWS S3, Cloudflare R2, or DigitalOcean Spaces
   - Modify `videoController.js` to use cloud storage SDK

### Deploy to Other Platforms

**Heroku:**
- Add FFmpeg buildpack: `https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest`
- Set environment variables
- Use Heroku Postgres add-on for file storage URL

**AWS EC2:**
- Install Node.js, MongoDB, FFmpeg manually
- Configure security groups for ports 3000, 27017
- Use PM2 for process management
- Setup Nginx reverse proxy

**Docker:**
```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📞 Support & Contact

- **GitHub:** [github.com/Mohankrishna1201/pulse-backend](https://github.com/Mohankrishna1201/pulse-backend)
- **Issues:** Report bugs via GitHub Issues
- **Documentation:** This README

---

## 📄 License

ISC License - See LICENSE file for details
