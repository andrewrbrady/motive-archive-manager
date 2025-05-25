#!/bin/bash

# Compile Canvas Extension for Vercel using Docker
# This creates a Linux binary that can run in Vercel's serverless environment

echo "🐳 Compiling Canvas Extension for Vercel using Docker..."

# Create a Dockerfile for compilation
cat > Dockerfile.canvas << 'EOF'
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    pkg-config \
    libopencv-dev \
    libopencv-contrib-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY extend_canvas.cpp .

# Compile with static linking where possible
RUN g++ -std=c++17 -O2 -Wall -o extend_canvas_linux extend_canvas.cpp \
    $(pkg-config --cflags opencv4) \
    $(pkg-config --libs opencv4) \
    -static-libgcc -static-libstdc++ && \
    strip extend_canvas_linux

# Check dependencies
RUN echo "📋 Binary info:" && \
    ls -la extend_canvas_linux && \
    file extend_canvas_linux && \
    echo "📋 Library dependencies:" && \
    (ldd extend_canvas_linux || echo "Static binary")

CMD ["cp", "extend_canvas_linux", "/output/"]
EOF

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -f Dockerfile.canvas -t canvas-compiler .

# Create output directory
mkdir -p docker-output

# Run the container to compile
echo "⚙️  Compiling binary..."
docker run --rm -v "$(pwd)/docker-output:/output" canvas-compiler cp extend_canvas_linux /output/

# Copy the binary to the project root
if [ -f "docker-output/extend_canvas_linux" ]; then
    cp docker-output/extend_canvas_linux .
    chmod +x extend_canvas_linux
    echo "✅ Binary compiled successfully!"
    echo "📏 Binary size: $(ls -lh extend_canvas_linux | awk '{print $5}')"
    
    # Test the binary (this will fail on macOS but that's expected)
    echo "🧪 Testing binary (may fail on non-Linux systems):"
    ./extend_canvas_linux 2>&1 | head -3 || echo "Binary test completed (expected to fail on non-Linux)"
else
    echo "❌ Compilation failed"
    exit 1
fi

# Cleanup
rm -f Dockerfile.canvas
rm -rf docker-output

echo "🎉 Canvas extension binary ready for Vercel deployment!"
echo "   Binary location: ./extend_canvas_linux"
echo "   Next steps:"
echo "   1. git add extend_canvas_linux"
echo "   2. git commit -m 'Update Linux binary'"
echo "   3. git push" 