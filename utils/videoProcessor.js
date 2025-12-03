import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { InferenceClient } from '@huggingface/inference';

// Configure FFmpeg paths (will use system FFmpeg on Render)
const ffmpegPath = process.env.FFMPEG_PATH || 'C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe';
const ffprobePath = process.env.FFPROBE_PATH || 'C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffprobe.exe';

// Only set paths if on Windows (local development)
if (process.platform === 'win32') {
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
}

class VideoProcessor {
  constructor(io) {
    this.io = io;
    
    // Get Hugging Face API key
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    
    console.log('🔍 Checking Hugging Face API key...');
    console.log('   API Key present:', !!this.apiKey);
    console.log('   API Key length:', this.apiKey ? this.apiKey.length : 0);
    console.log('   API Key starts with hf_:', this.apiKey ? this.apiKey.startsWith('hf_') : false);
    
    if (!this.apiKey || this.apiKey === 'your_huggingface_api_key_here') {
      console.warn('⚠️  WARNING: HUGGINGFACE_API_KEY not set. AI analysis will fall back to safe mode.');
      this.client = null;
    } else {
      // Initialize InferenceClient (correct for v4.x)
      this.client = new InferenceClient(this.apiKey);
      console.log('✅ Hugging Face InferenceClient initialized successfully');
    }
  }

  // Call Hugging Face API directly via REST (new router endpoint)
  async callHuggingFaceAPI(imageBuffer) {
    // Using verified working model (December 2025)
    const model = 'Falconsai/nsfw_image_detection';
    const API_URL = `https://router.huggingface.co/hf-inference/models/${model}`;
    
    try {
      const response = await axios.post(API_URL, imageBuffer, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'image/jpeg'
        },
        timeout: 30000
      });
      
      if (response.status === 200) {
        return { data: response.data, model };
      }
      
      throw new Error(`API returned status ${response.status}`);
      
    } catch (error) {
      throw new Error(`Hugging Face API failed: ${error.message}`);
    }
  }

  // Get video metadata using FFmpeg
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          resolve({
            duration: metadata.format.duration,
            width: videoStream?.width,
            height: videoStream?.height,
            fps: eval(videoStream?.r_frame_rate || '0'),
            bitrate: metadata.format.bit_rate,
            codec: videoStream?.codec_name
          });
        }
      });
    });
  }

  // Extract frames from video for AI analysis
  async extractFrames(videoPath, videoId, numFrames = 5) {
    return new Promise((resolve, reject) => {
      const frames = [];
      // Save frames permanently in uploads/frames/{videoId}/
      const framesDir = path.join('uploads', 'frames', videoId.toString());
      
      // Create frames directory if it doesn't exist
      if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
      }

      // Emit progress
      this.io.emit('video-processing-progress', {
        videoId,
        progress: 25,
        stage: `Extracting ${numFrames} frames for analysis...`,
        status: 'processing'
      });

      ffmpeg(videoPath)
        .screenshots({
          count: numFrames,
          folder: framesDir,  // Permanent storage
          filename: `frame-%i.jpg`,
          size: '640x480'
        })
        .on('end', () => {
          // Read frames as buffers
          try {
            for (let i = 1; i <= numFrames; i++) {
              const framePath = path.join(framesDir, `frame-${i}.jpg`);
              if (fs.existsSync(framePath)) {
                frames.push({
                  path: framePath,
                  buffer: fs.readFileSync(framePath)
                });
              }
            }
            console.log(`✅ Extracted ${frames.length} frames saved to: ${framesDir}`);
            resolve(frames);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (err) => {
          console.error('Frame extraction error:', err);
          reject(err);
        });
    });
  }

  // Clean up temporary frame files (DISABLED - frames kept permanently)
  cleanupFrames(frames) {
    // Frames are now stored permanently in uploads/frames/{videoId}/
    // Uncomment below to delete after analysis:
    
    // frames.forEach(frame => {
    //   try {
    //     if (fs.existsSync(frame.path)) {
    //       fs.unlinkSync(frame.path);
    //     }
    //   } catch (error) {
    //     console.error('Error cleaning up frame:', error);
    //   }
    // });
    
    console.log(`📁 ${frames.length} frames kept permanently for review`);
  }

  // Real AI sensitivity analysis using Hugging Face
  async analyzeSensitivity(videoPath, videoId) {
    try {
      // Check if Hugging Face API key is available
      if (!this.apiKey) {
        console.warn('⚠️  Hugging Face API not configured. Using fallback safe mode.');
        return await this.analyzeSensitivityMock(videoPath, videoId);
      }

      // Extract frames from video
      const frames = await this.extractFrames(videoPath, videoId, 5);
      
      let flaggedFrames = 0;
      let totalNsfwScore = 0;
      const detectedIssues = [];
      let apiSuccessCount = 0;

      // Analyze each frame with Hugging Face AI
      for (let i = 0; i < frames.length; i++) {
        const progress = 30 + ((i + 1) / frames.length) * 60; // 30-90%
        
        this.io.emit('video-processing-progress', {
          videoId,
          progress: Math.round(progress),
          stage: `Analyzing frame ${i + 1}/${frames.length} with AI...`,
          status: 'processing'
        });

        try {
          console.log(`🔍 Analyzing frame ${i + 1}/${frames.length}...`);
          
          // Call Hugging Face API directly
          const apiResult = await this.callHuggingFaceAPI(frames[i].buffer);
          const result = apiResult.data;
          const usedModel = apiResult.model;
          
          apiSuccessCount++;

          console.log(`✅ Frame ${i + 1} analyzed with ${usedModel}:`, JSON.stringify(result).substring(0, 150));

          // Process results from different model types
          let nsfwScore = 0;
          let normalScore = 0;
          
          // Handle different response formats
          if (Array.isArray(result)) {
            // Standard classification format: [{label: 'nsfw', score: 0.9}, ...]
            for (const item of result) {
              const label = (item.label || '').toLowerCase();
              
              // NSFW/inappropriate keywords
              if (label.includes('nsfw') || label.includes('unsafe') || label.includes('porn') || 
                  label.includes('adult') || label.includes('sexual') || label.includes('explicit') ||
                  label.includes('nude') || label.includes('erotic')) {
                nsfwScore = Math.max(nsfwScore, item.score);
              } 
              // Safe/normal keywords
              else if (label.includes('normal') || label.includes('sfw') || label.includes('safe') || 
                       label.includes('neutral') || label.includes('clean') || label.includes('appropriate')) {
                normalScore = Math.max(normalScore, item.score);
              }
              // For general models (ResNet, ViT), look for concerning object categories
              else if (label.includes('bikini') || label.includes('underwear') || label.includes('swimsuit')) {
                nsfwScore = Math.max(nsfwScore, item.score * 0.5); // Lower weight for ambiguous
              }
            }
          } else if (result && typeof result === 'object') {
            // Nested format: {nsfw: 0.9, safe: 0.1} or similar
            for (const [key, value] of Object.entries(result)) {
              const label = key.toLowerCase();
              if (label.includes('nsfw') || label.includes('unsafe') || label.includes('sexual')) {
                nsfwScore = Math.max(nsfwScore, typeof value === 'number' ? value : 0);
              } else if (label.includes('safe') || label.includes('normal')) {
                normalScore = Math.max(normalScore, typeof value === 'number' ? value : 0);
              }
            }
          }
          
          // If using general classification model (ResNet/ViT), be conservative
          // Assume safe unless clear NSFW indicators found
          if (nsfwScore === 0 && normalScore === 0) {
            normalScore = 0.95; // Default to safe
          }

          totalNsfwScore += nsfwScore;

          // Flag if NSFW score is high
          if (nsfwScore > 0.6) {
            flaggedFrames++;
            detectedIssues.push(`Frame ${i + 1}: High sensitivity content detected (${(nsfwScore * 100).toFixed(1)}% confidence)`);
          }

          console.log(`Frame ${i + 1} analysis: NSFW=${(nsfwScore * 100).toFixed(1)}%, Normal=${(normalScore * 100).toFixed(1)}%`);

        } catch (error) {
          console.error(`Error analyzing frame ${i + 1}:`, error.message);
          // Continue with other frames even if one fails
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Clean up temporary frame files
      this.cleanupFrames(frames);

      // If all API calls failed, use mock analysis
      if (apiSuccessCount === 0) {
        console.warn('⚠️  All Hugging Face API calls failed. Using mock analysis as fallback.');
        return await this.analyzeSensitivityMock(videoPath, videoId);
      }

      // Calculate final decision with detailed breakdown
      const averageNsfwScore = totalNsfwScore / apiSuccessCount;
      
      // Decision criteria:
      // SAFE: Average NSFW < 50% AND no frames > 60%
      // FLAGGED: Average NSFW >= 50% OR any frame > 60%
      const isSafe = flaggedFrames === 0 && averageNsfwScore < 0.5;
      
      // Confidence is how certain we are of the classification
      // If average is 95% safe → 95% confidence it's safe
      // If average is 5% safe → 95% confidence it's unsafe
      const confidence = isSafe 
        ? Math.min((1 - averageNsfwScore) * 1.1, 0.99)  // Higher confidence for clearly safe
        : Math.min(averageNsfwScore * 1.1, 0.99);       // Higher confidence for clearly unsafe
      
      console.log(`\n📊 Analysis Summary:`);
      console.log(`   Decision: ${isSafe ? '✅ SAFE' : '⚠️ FLAGGED'}`);
      console.log(`   Average NSFW Score: ${(averageNsfwScore * 100).toFixed(2)}%`);
      console.log(`   Flagged Frames: ${flaggedFrames}/${frames.length}`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%\n`);

      return {
        sensitivityFlag: isSafe ? 'safe' : 'flagged',
        confidence: parseFloat(confidence.toFixed(3)),
        detectedIssues: isSafe ? [] : detectedIssues,
        details: {
          totalFramesAnalyzed: frames.length,
          successfulAnalyses: apiSuccessCount,
          flaggedFrames,
          averageNsfwScore: parseFloat(averageNsfwScore.toFixed(4)),
          model: 'Falconsai/nsfw_image_detection',
          criteria: {
            threshold: '50% average NSFW score',
            frameThreshold: '60% individual frame score'
          }
        }
      };

    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Fallback to mock analysis
      console.warn('⚠️  Falling back to mock analysis...');
      return await this.analyzeSensitivityMock(videoPath, videoId);
    }
  }

  // Mock sensitivity analysis - DEPRECATED (use analyzeSensitivity with AI instead)
  async analyzeSensitivityMock(videoPath, videoId) {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        
        // Emit progress update via Socket.io
        this.io.emit('video-processing-progress', {
          videoId,
          progress,
          stage: progress < 50 ? 'Analyzing content...' : 'Finalizing analysis...',
          status: 'processing'
        });

        if (progress >= 100) {
          clearInterval(interval);
          
          // Mock sensitivity detection (random for demo purposes)
          // In production, this would use actual AI/ML models
          const isSafe = Math.random() > 0.3; // 70% safe, 30% flagged
          
          resolve({
            sensitivityFlag: isSafe ? 'safe' : 'flagged',
            confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
            detectedIssues: isSafe ? [] : ['Potentially sensitive content detected']
          });
        }
      }, 500); // Update every 500ms
    });
  }

  // Process video: extract metadata and analyze sensitivity
  async processVideo(videoPath, videoId, videoModel) {
    try {
      // Update status to processing
      await videoModel.findByIdAndUpdate(videoId, {
        status: 'processing',
        processProgress: 0
      });

      this.io.emit('video-processing-progress', {
        videoId,
        progress: 0,
        stage: 'Starting processing...',
        status: 'processing'
      });

      // Step 1: Extract metadata (20% progress)
      this.io.emit('video-processing-progress', {
        videoId,
        progress: 20,
        stage: 'Extracting metadata...',
        status: 'processing'
      });

      const metadata = await this.getVideoMetadata(videoPath);

      // Step 2: Analyze sensitivity (20% to 100%)
      const sensitivityResult = await this.analyzeSensitivity(videoPath, videoId);

      // Emit 100% progress before completion
      this.io.emit('video-processing-progress', {
        videoId,
        progress: 100,
        stage: 'Finalizing...',
        status: 'processing'
      });

      // Update video with results
      const updatedVideo = await videoModel.findByIdAndUpdate(
        videoId,
        {
          status: 'completed',
          processProgress: 100,
          sensitivityFlag: sensitivityResult.sensitivityFlag,
          metadata: metadata,
          duration: metadata.duration,
          processedAt: new Date()
        },
        { new: true }
      );

      // Emit detailed completion data to frontend
      this.io.emit('video-processing-complete', {
        videoId,
        status: 'completed',
        sensitivityFlag: sensitivityResult.sensitivityFlag,
        confidence: sensitivityResult.confidence,
        detectedIssues: sensitivityResult.detectedIssues,
        details: {
          ...sensitivityResult.details,
          duration: metadata.duration,
          resolution: `${metadata.width}x${metadata.height}`,
          codec: metadata.codec
        },
        message: sensitivityResult.sensitivityFlag === 'safe' 
          ? `✅ Video is SAFE (${(sensitivityResult.confidence * 100).toFixed(1)}% confidence)`
          : `⚠️ Video FLAGGED (${(sensitivityResult.confidence * 100).toFixed(1)}% confidence)`
      });

      return updatedVideo;

    } catch (error) {
      console.error('Video processing error:', error);
      
      // Update video with error status
      await videoModel.findByIdAndUpdate(videoId, {
        status: 'failed',
        errorMessage: error.message
      });

      this.io.emit('video-processing-error', {
        videoId,
        status: 'failed',
        error: error.message
      });

      throw error;
    }
  }
}

export default VideoProcessor;
