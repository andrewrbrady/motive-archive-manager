#!/bin/bash

# Canvas Extension C++ Build Script
# This script compiles the extend_canvas program with OpenCV support

echo "🔧 Building Canvas Extension C++ Program..."

# Check if we're in a CI/CD environment
if [ "$VERCEL" = "1" ] || [ "$CI" = "true" ]; then
    echo "📦 Detected CI/CD environment: Vercel"
    echo "⚠️  Vercel's build environment doesn't support OpenCV installation"
    echo "   Canvas extension will be disabled in production"
    echo "   The feature will work in local development with OpenCV installed"
    exit 0  # Don't fail the build, just skip compilation
fi

# Verify OpenCV is available (for local development)
if ! command -v pkg-config >/dev/null 2>&1; then
    echo "❌ pkg-config not found. Please install pkg-config first."
    echo "   - macOS: brew install pkg-config"
    echo "   - Ubuntu: sudo apt install pkg-config"
    exit 0
fi

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
    echo "   Canvas extension feature will be disabled"
    exit 0  # Don't fail the build
fi

echo "🎉 Build completed successfully!" 