#!/bin/bash

# Compile Canvas Extension for Vercel Deployment
# This script uses Docker to compile the C++ program for Linux

echo "🐳 Compiling Canvas Extension for Vercel (Linux) using Docker..."

# Check if Docker is available
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker not found. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if extend_canvas.cpp exists
if [ ! -f "extend_canvas.cpp" ]; then
    echo "❌ extend_canvas.cpp not found in current directory"
    exit 1
fi

echo "📦 Creating temporary Docker container with OpenCV..."

# Create a temporary Dockerfile
cat > Dockerfile.temp << 'EOF'
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    pkg-config \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY extend_canvas.cpp .

# Compile with static linking for better portability
RUN g++ -std=c++17 -O2 -Wall -static -o extend_canvas_linux extend_canvas.cpp \
    $(pkg-config --cflags --libs opencv4) || \
    g++ -std=c++17 -O2 -Wall -o extend_canvas_linux extend_canvas.cpp \
    $(pkg-config --cflags --libs opencv4)

CMD ["./extend_canvas_linux"]
EOF

echo "🔨 Building Docker image and compiling..."

# Build the Docker image and compile
docker build -f Dockerfile.temp -t canvas-compiler . && \
docker run --rm -v "$(pwd):/output" canvas-compiler sh -c "cp extend_canvas_linux /output/"

# Clean up
rm -f Dockerfile.temp

if [ -f "extend_canvas_linux" ]; then
    echo "✅ Successfully compiled extend_canvas_linux"
    echo "📏 Binary size: $(ls -lh extend_canvas_linux | awk '{print $5}')"
    
    # Test the binary
    if ./extend_canvas_linux 2>&1 | grep -q "Usage:"; then
        echo "✅ Binary is working correctly"
        echo ""
        echo "🚀 Next steps:"
        echo "   1. git add extend_canvas_linux"
        echo "   2. git commit -m 'Add pre-compiled Linux binary for Vercel'"
        echo "   3. git push"
        echo ""
        echo "   The canvas extension will now work on Vercel!"
    else
        echo "⚠️  Binary compiled but may not be working correctly"
        echo "   You may need to install additional runtime dependencies"
    fi
else
    echo "❌ Compilation failed"
    echo "   Check the Docker build output for errors"
    exit 1
fi 