#!/bin/bash

# Create a simple test binary for testing the bundling mechanism
echo "🔧 Creating test binary for Vercel bundling verification..."

cat > test_extend_canvas.cpp << 'EOF'
#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    if (argc < 4) {
        std::cerr << "Usage: " << argv[0] << " <in> <out> <desired_h> [pad%] [white_thresh|-1]" << std::endl;
        return 1;
    }
    
    std::cout << "Test binary - Canvas extension simulation" << std::endl;
    std::cout << "Input: " << argv[1] << std::endl;
    std::cout << "Output: " << argv[2] << std::endl;
    std::cout << "Height: " << argv[3] << std::endl;
    
    // Create a dummy output file
    std::string outputPath = argv[2];
    std::cout << "Creating dummy output at: " << outputPath << std::endl;
    
    return 0;
}
EOF

echo "🔨 Compiling test binary..."
g++ -std=c++17 -O2 -Wall -o extend_canvas_linux test_extend_canvas.cpp

if [ -f "extend_canvas_linux" ]; then
    echo "✅ Test binary created successfully"
    echo "📏 Binary size: $(ls -lh extend_canvas_linux | awk '{print $5}')"
    
    # Test the binary
    if ./extend_canvas_linux 2>&1 | grep -q "Usage:"; then
        echo "✅ Test binary is working correctly"
        echo ""
        echo "🚀 This is a TEST BINARY for verifying the bundling mechanism."
        echo "   Replace with the real binary compiled with OpenCV for production use."
        echo ""
        echo "   To get the real binary:"
        echo "   1. Push this commit to trigger GitHub Actions"
        echo "   2. Or run: ./compile-for-vercel.sh (requires Docker)"
        echo "   3. Or compile manually on Linux with OpenCV"
    else
        echo "⚠️  Test binary may not be working correctly"
    fi
    
    # Clean up
    rm -f test_extend_canvas.cpp
else
    echo "❌ Failed to create test binary"
    exit 1
fi 