# Use Ubuntu 22.04 as base image
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install system dependencies and OpenCV
RUN apt-get update && apt-get install -y \
    curl \
    g++ \
    make \
    pkg-config \
    libopencv-dev \
    libopencv-contrib-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy source files (all JS files and directories)
COPY *.js ./
COPY node_modules/ ./node_modules/
COPY extend_canvas.cpp ./
COPY matte_generator.cpp ./
COPY image_cropper.cpp ./

# Compile the canvas extension binary (non-static to use system libraries)
RUN g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp \
    $(pkg-config --cflags --libs opencv4)

# Compile the matte generator binary
RUN g++ -std=c++17 -O2 -Wall -o matte_generator matte_generator.cpp \
    $(pkg-config --cflags --libs opencv4)

# Compile the image cropper binary
RUN g++ -std=c++17 -O2 -Wall -o image_cropper image_cropper.cpp \
    $(pkg-config --cflags --libs opencv4)

# Make binaries executable
RUN chmod +x extend_canvas matte_generator image_cropper

# Create temp directories
RUN mkdir -p /tmp/canvas-extension /tmp/image-matte /tmp/image-crop

# Start the server
CMD ["node", "server.js"]
