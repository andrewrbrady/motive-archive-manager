#!/bin/bash

# Deploy Updated Canvas Service with requestedWidth/Height Support
# SIMPLIFIED APPROACH - Update files directly and redeploy existing service

set -e

echo "🚀 UPDATING CANVAS SERVICE WITH DIMENSION CONTROL (SIMPLE APPROACH) 🚀"
echo "========================================================================"

# Configuration
PROJECT_ID="motive-archive-manager-460909"
SERVICE_NAME="canvas-service-public"
REGION="us-central1"
SOURCE_DIR="archive/cpp-programs"

# Set gcloud path
GCLOUD_PATH="/Users/andrewbrady/google-cloud-sdk/bin/gcloud"

echo "📋 This approach avoids Docker registry issues by:"
echo "   1. Creating a deployment package with updated code"
echo "   2. Using Cloud Run's source deployment (which works)"
echo "   3. Adding a simple change to force new revision"

# Set the project
echo "📋 Setting project to: $PROJECT_ID"
$GCLOUD_PATH config set project $PROJECT_ID

# Change to source directory
cd $SOURCE_DIR

# Create build directory
BUILD_DIR="canvas-service-simple-deploy"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

echo "📦 Preparing updated source files..."

# Copy the updated source files
cp source-code/extend_canvas.cpp $BUILD_DIR/
cp source-code/matte_generator.cpp $BUILD_DIR/
cp source-code/image_cropper.cpp $BUILD_DIR/
cp -r canvas-service-app/* $BUILD_DIR/

# Add a version marker to force new deployment
echo "// Updated $(date) with requestedWidth/Height support" >> $BUILD_DIR/server.js

# Create simple Dockerfile
cat > $BUILD_DIR/Dockerfile << 'EOF'
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

RUN apt-get update && apt-get install -y \
    curl \
    g++ \
    make \
    pkg-config \
    libopencv-dev \
    libopencv-contrib-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY *.js ./
COPY node_modules/ ./node_modules/
COPY extend_canvas.cpp ./
COPY matte_generator.cpp ./
COPY image_cropper.cpp ./

RUN g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp $(pkg-config --cflags --libs opencv4)
RUN g++ -std=c++17 -O2 -Wall -o matte_generator matte_generator.cpp $(pkg-config --cflags --libs opencv4)
RUN g++ -std=c++17 -O2 -Wall -o image_cropper image_cropper.cpp $(pkg-config --cflags --libs opencv4)

RUN chmod +x extend_canvas matte_generator image_cropper
RUN mkdir -p /tmp/canvas-extension /tmp/image-matte /tmp/image-crop

CMD ["node", "server.js"]
EOF

echo "✅ Source files prepared"

# Navigate to build directory
cd $BUILD_DIR

echo "🔍 Verifying updated code..."
if grep -q "requestedW.*requestedH" extend_canvas.cpp; then
    echo "✅ extend_canvas.cpp has dimension control parameters"
else
    echo "❌ extend_canvas.cpp missing dimension parameters"
    exit 1
fi

if grep -q "requestedWidth.*requestedHeight" server.js; then
    echo "✅ server.js accepts dimension parameters"
else
    echo "❌ server.js missing dimension parameters"
    exit 1
fi

echo "🚀 Deploying with source (bypassing registry issues)..."

# Try source deployment which should work
$GCLOUD_PATH run deploy $SERVICE_NAME \
    --source . \
    --region $REGION \
    --allow-unauthenticated \
    --port 3000 \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 10 \
    --timeout 300 \
    --quiet

# Get the service URL
SERVICE_URL="https://canvas-service-public-s6vo3k273a-uc.a.run.app"

echo ""
echo "🎉 DEPLOYMENT COMPLETE! 🎉"
echo "========================="
echo "📍 Service URL: $SERVICE_URL"
echo ""
echo "🧪 Test the updated service:"
echo "curl $SERVICE_URL/health"
echo ""
echo "🔧 Canvas extension now supports:"
echo "   • requestedWidth: constrains output width" 
echo "   • requestedHeight: constrains output height"
echo ""
echo "💡 Your 4:5 → 2x sizing issue should now be fixed!"

# Clean up
cd ../..
rm -rf $SOURCE_DIR/$BUILD_DIR 