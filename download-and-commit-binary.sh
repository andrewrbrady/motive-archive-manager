#!/bin/bash

# Helper script to commit the downloaded Linux binary
echo "🔧 Adding Linux binary for Vercel deployment..."

if [ ! -f "extend_canvas_linux" ]; then
    echo "❌ extend_canvas_linux not found in current directory"
    echo "   Please download the artifact from GitHub Actions and extract it here first"
    exit 1
fi

# Make it executable
chmod +x extend_canvas_linux

# Verify it's a valid binary
if file extend_canvas_linux | grep -q "ELF.*executable"; then
    echo "✅ Valid Linux binary detected"
    echo "📏 Binary size: $(ls -lh extend_canvas_linux | awk '{print $5}')"
else
    echo "⚠️  File doesn't appear to be a valid Linux binary"
    file extend_canvas_linux
fi

# Add and commit
git add extend_canvas_linux
git commit -m "Add compiled Linux binary for Vercel deployment"

echo "🎉 Binary committed! Ready to push:"
echo "   git push" 