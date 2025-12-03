import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  mimeType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  sensitivityFlag: {
    type: String,
    enum: ['safe', 'flagged', 'pending'],
    default: 'pending'
  },
  processProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: String,
    default: 'default',
    trim: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  errorMessage: {
    type: String
  },
  metadata: {
    width: Number,
    height: Number,
    fps: Number,
    bitrate: Number,
    codec: String
  }
}, {
  timestamps: true
});

// Index for faster queries
videoSchema.index({ userId: 1, uploadDate: -1 });
videoSchema.index({ userId: 1, organization: 1 });
videoSchema.index({ status: 1 });
videoSchema.index({ sensitivityFlag: 1 });
videoSchema.index({ organization: 1, uploadDate: -1 });

const Video = mongoose.model('Video', videoSchema);

export default Video;
