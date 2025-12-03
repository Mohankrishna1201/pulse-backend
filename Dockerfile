# Use Node.js 18 LTS
FROM node:18-slim

# Install FFmpeg for video processing
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads/temp

# Expose port
EXPOSE 3000


# Start the application
CMD ["node", "index.js"]
