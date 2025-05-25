#!/bin/bash

# Canvas Extension C++ Build Script
# This script compiles the extend_canvas program with OpenCV support

set -e  # Exit on any error

echo "🔧 Building Canvas Extension C++ Program..."

# Check if we're in a CI/CD environment
if [ "$VERCEL" = "1" ] || [ "$CI" = "true" ]; then
    echo "📦 Detected CI/CD environment"
    
    # Try to install OpenCV if not available
    if ! pkg-config --exists opencv4; then
        echo "📥 Installing OpenCV..."
        
        # Update package list
        apt-get update -qq
        
        # Install OpenCV and dependencies
        apt-get install -y -qq \
            libopencv-dev \
            pkg-config \
            build-essential \
            g++ \
            cmake
        
        echo "✅ OpenCV installation completed"
    else
        echo "✅ OpenCV already available"
    fi
fi

# Verify OpenCV is available
if ! pkg-config --exists opencv4; then
    echo "❌ OpenCV 4 not found. Canvas extension will be disabled."
    echo "   To enable this feature, install OpenCV 4:"
    echo "   - macOS: brew install opencv"
    echo "   - Ubuntu: sudo apt install libopencv-dev"
    exit 0  # Don't fail the build, just skip compilation
fi

# Get OpenCV flags
OPENCV_CFLAGS=$(pkg-config --cflags opencv4)
OPENCV_LIBS=$(pkg-config --libs opencv4)

echo "🔨 Compiling extend_canvas..."
echo "   OpenCV CFLAGS: $OPENCV_CFLAGS"
echo "   OpenCV LIBS: $OPENCV_LIBS"

# Compile the program
if g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp $OPENCV_CFLAGS $OPENCV_LIBS; then
    echo "✅ Canvas extension compiled successfully!"
    
    # Verify the executable works
    if ./extend_canvas 2>&1 | grep -q "Usage:"; then
        echo "✅ Canvas extension executable is working"
    else
        echo "⚠️  Canvas extension compiled but may not be working correctly"
    fi
else
    echo "❌ Canvas extension compilation failed"
    echo "   Canvas extension feature will be disabled in production"
    exit 0  # Don't fail the build
fi

echo "🎉 Build completed successfully!" 