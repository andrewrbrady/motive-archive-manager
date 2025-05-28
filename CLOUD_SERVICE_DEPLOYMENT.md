# Cloud Service Deployment Guide

## Overview

This guide covers deploying the canvas service (extend-canvas, create-matte, crop-image) to Google Cloud Run. Follow these steps exactly to avoid common deployment issues.

## Prerequisites

- Docker installed and running
- Google Cloud CLI (`gcloud`) installed and authenticated
- Project set to `motive-archive-manager-460909`

## Quick Setup Commands

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set the correct project
gcloud config set project motive-archive-manager-460909

# Verify you're in the right directory
pwd  # Should be /path/to/motive-archive-manager
```

## Building the Docker Image

### ⚠️ CRITICAL: Architecture Requirements

**Always build for `linux/amd64` architecture** - Cloud Run requires this even on Apple Silicon Macs.

```bash
# Build with correct architecture (REQUIRED)
docker build --platform linux/amd64 -f Dockerfile.canvas-service-simple -t gcr.io/motive-archive-manager-460909/canvas-service:v[VERSION] .

# Example:
docker build --platform linux/amd64 -f Dockerfile.canvas-service-simple -t gcr.io/motive-archive-manager-460909/canvas-service:v2.3 .
```

### Version Naming Convention

Use semantic versioning: `v2.3`, `v2.4`, etc. Always increment when making changes to force new Docker layers.

## Testing Locally (Optional but Recommended)

```bash
# Test the image locally first
docker run -p 3002:3000 -e PORT=3000 gcr.io/motive-archive-manager-460909/canvas-service:v[VERSION]

# In another terminal, test endpoints:
curl http://localhost:3002/health
curl -X POST http://localhost:3002/crop-image -H "Content-Type: application/json" -d '{"imageUrl":"https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop","cropX":100,"cropY":100,"cropWidth":400,"cropHeight":300,"outputWidth":400,"outputHeight":300,"scale":1.0}' | head -c 200

# Stop the container when done
docker stop $(docker ps -q --filter "ancestor=gcr.io/motive-archive-manager-460909/canvas-service:v[VERSION]")
```

## Pushing to Registry

```bash
# Push the image
docker push gcr.io/motive-archive-manager-460909/canvas-service:v[VERSION]
```

## Deploying to Cloud Run

```bash
# Deploy to the existing service
gcloud run deploy canvas-service-public \
  --image gcr.io/motive-archive-manager-460909/canvas-service:v[VERSION] \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --timeout 300
```

## Verifying Deployment

### Check Revisions

```bash
# List recent revisions
gcloud run revisions list --service canvas-service-public --region us-central1 --limit=5

# If the latest revision shows "..." (deploying), wait for it to complete
# If it shows "X" (failed), check logs (see troubleshooting section)
```

### Route Traffic to New Revision

```bash
# Get the latest revision name from the list above, then:
gcloud run services update-traffic canvas-service-public \
  --to-revisions [REVISION-NAME]=100 \
  --region us-central1

# Example:
gcloud run services update-traffic canvas-service-public \
  --to-revisions canvas-service-public-00014-abc=100 \
  --region us-central1
```

### Test the Deployed Service

```bash
# Test health endpoint
curl https://canvas-service-public-s6vo3k273a-uc.a.run.app/health

# Test crop-image endpoint
curl -X POST https://canvas-service-public-s6vo3k273a-uc.a.run.app/crop-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop","cropX":100,"cropY":100,"cropWidth":400,"cropHeight":300,"outputWidth":400,"outputHeight":300,"scale":1.0}' \
  | head -c 200

# Should return: {"success":true,"processedImageUrl":"data:image/jpeg;base64,...
```

## Available Endpoints

The deployed service provides these endpoints:

- `GET /health` - Health check
- `POST /extend-canvas` - Canvas extension with OpenCV
- `POST /create-matte` - Image matte creation
- `POST /crop-image` - Image cropping and resizing

## Troubleshooting

### Common Issues and Solutions

#### 1. "exec format error" in Cloud Run logs

**Problem**: Built for wrong architecture (arm64 instead of amd64)
**Solution**: Rebuild with `--platform linux/amd64` flag

#### 2. "Container failed to start"

**Problem**: Usually architecture mismatch or missing dependencies
**Solution**:

1. Check logs: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=canvas-service-public AND resource.labels.revision_name=[REVISION-NAME]" --limit=20`
2. Test image locally first
3. Ensure all binaries are compiled in Dockerfile

#### 3. Cloud Run uses old revision

**Problem**: Docker layers are identical, Cloud Run doesn't create new revision
**Solution**:

1. Make a small change to force new layer (add version comment to server.js)
2. Use new version tag
3. Check revision list to confirm new revision was created

#### 4. "Cannot POST /crop-image" (404 error)

**Problem**: Deployed service doesn't have the endpoint
**Solution**:

1. Verify you're hitting the correct revision
2. Check that the new image was actually deployed
3. Ensure server.js includes the crop-image endpoint

### Checking Logs

```bash
# Get logs for a specific revision
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=canvas-service-public AND resource.labels.revision_name=[REVISION-NAME]" --limit=20 --format="value(timestamp,textPayload)"

# Example:
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=canvas-service-public AND resource.labels.revision_name=canvas-service-public-00013-rom" --limit=20 --format="value(timestamp,textPayload)"
```

### Rolling Back

```bash
# If deployment fails, rollback to working revision
gcloud run services update-traffic canvas-service-public \
  --to-revisions canvas-service-public-00005-tix=100 \
  --region us-central1
```

## File Structure

The deployment uses these key files:

- `Dockerfile.canvas-service-simple` - Docker build configuration
- `canvas-service/server.js` - Express server with all endpoints
- `canvas-service/package.json` - Node.js dependencies
- `extend_canvas.cpp` - Canvas extension binary source
- `matte_generator.cpp` - Matte generator binary source
- `image_cropper.cpp` - Image cropper binary source

## Environment Variables

Cloud Run automatically sets:

- `PORT=3000` - Server port (don't override this)

## Resource Limits

Current configuration:

- **Memory**: 2Gi
- **CPU**: 2 cores
- **Max Instances**: 10
- **Timeout**: 300 seconds

## Service URL

Production service: `https://canvas-service-public-s6vo3k273a-uc.a.run.app`

## Integration with Frontend

The frontend uses this service when `processingMethod: "cloud"` is selected in:

- Image crop modal (`ImageCropModal.tsx`)
- Canvas extension features
- Image matte creation features

### Response Format Differences

- **Local API**: Returns `imageData` (base64 string)
- **Cloud Service**: Returns `processedImageUrl` (data URL: `data:image/jpeg;base64,...`)

The frontend handles both formats automatically for seamless switching between processing methods.

## Security

- Service allows unauthenticated requests (`
