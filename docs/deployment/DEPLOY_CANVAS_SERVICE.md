# Canvas Extension Service Deployment

This guide explains how to deploy the canvas extension service to various cloud platforms to get the full C++ OpenCV functionality with proper car/shadow detection and background stretching.

## 🚀 **Quick Deploy Options**

### 1. **Railway** (Recommended - Easiest)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/canvas-extension)

1. Click the Railway deploy button above
2. Connect your GitHub account
3. Fork this repository
4. Railway will automatically build and deploy
5. Copy the service URL (e.g., `https://your-app.railway.app`)
6. Add to your Vercel environment variables:
   ```
   CANVAS_EXTENSION_SERVICE_URL=https://your-app.railway.app
   ```

### 2. **Render**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `docker build -f Dockerfile.canvas-service -t canvas-service .`
   - **Start Command**: `docker run -p $PORT:3000 canvas-service`
   - **Environment**: Docker
5. Deploy and copy the service URL
6. Add to Vercel environment variables

### 3. **Google Cloud Run**

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/canvas-extension .

# Deploy to Cloud Run
gcloud run deploy canvas-extension \
  --image gcr.io/YOUR_PROJECT_ID/canvas-extension \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2
```

### 4. **AWS Lambda with Container Images**

1. Build and push to ECR:

```bash
# Create ECR repository
aws ecr create-repository --repository-name canvas-extension

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -f Dockerfile.canvas-service -t canvas-extension .
docker tag canvas-extension:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/canvas-extension:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/canvas-extension:latest
```

2. Create Lambda function with container image
3. Set up API Gateway to trigger the function

## 🔧 **Manual Docker Deployment**

If you have your own server or VPS:

```bash
# Build the image
docker build -f Dockerfile.canvas-service -t canvas-extension .

# Run the container
docker run -d \
  --name canvas-extension \
  -p 3000:3000 \
  --restart unless-stopped \
  canvas-extension

# Check if it's running
curl http://localhost:3000/health
```

## ⚙️ **Environment Configuration**

After deploying to any platform, add this environment variable to your Vercel project:

```bash
# In Vercel Dashboard → Settings → Environment Variables
CANVAS_EXTENSION_SERVICE_URL=https://your-deployed-service-url.com
```

Or via Vercel CLI:

```bash
vercel env add CANVAS_EXTENSION_SERVICE_URL
# Enter your service URL when prompted
```

## 🧪 **Testing the Service**

Test your deployed service:

```bash
curl -X POST https://your-service-url.com/extend-canvas \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/car-image.jpg",
    "desiredHeight": 1350,
    "paddingPct": 0.05,
    "whiteThresh": -1
  }'
```

Expected response:

```json
{
  "success": true,
  "processedImageUrl": "data:image/jpeg;base64,/9j/4AAQ...",
  "message": "Image processed successfully with C++ OpenCV"
}
```

## 📊 **Service Comparison**

| Platform         | Ease       | Cost | Performance | Notes                               |
| ---------------- | ---------- | ---- | ----------- | ----------------------------------- |
| Railway          | ⭐⭐⭐⭐⭐ | $    | ⭐⭐⭐⭐    | Easiest setup, good for development |
| Render           | ⭐⭐⭐⭐   | $    | ⭐⭐⭐⭐    | Simple, good free tier              |
| Google Cloud Run | ⭐⭐⭐     | $$   | ⭐⭐⭐⭐⭐  | Best performance, pay-per-use       |
| AWS Lambda       | ⭐⭐       | $    | ⭐⭐⭐      | Complex setup, cold starts          |
| DigitalOcean     | ⭐⭐⭐     | $$   | ⭐⭐⭐⭐    | Good balance                        |

## 🔄 **Fallback Behavior**

Your app will now work with this priority:

1. **Remote Service** (if `CANVAS_EXTENSION_SERVICE_URL` is set)

   - Full C++ OpenCV functionality
   - Car/shadow detection
   - Proper background stretching

2. **Local Binary** (if remote fails)

   - macOS: `extend_canvas_macos`
   - Linux: `extend_canvas`

3. **JavaScript Fallback** (if both fail)
   - Simple white space addition
   - Always works but less sophisticated

## 🚨 **Troubleshooting**

### Service Not Responding

```bash
# Check service health
curl https://your-service-url.com/health

# Check logs (platform-specific)
# Railway: Check dashboard logs
# Render: Check service logs
# Cloud Run: gcloud logs read
```

### Environment Variable Issues

```bash
# Verify in Vercel
vercel env ls

# Test locally
CANVAS_EXTENSION_SERVICE_URL=https://your-service.com npm run dev
```

### Image Processing Errors

- Check image URL is publicly accessible
- Verify image format (JPEG/PNG supported)
- Check service logs for detailed error messages

## 💰 **Cost Estimates**

For typical usage (100 images/month):

- **Railway**: ~$5/month
- **Render**: Free tier available
- **Google Cloud Run**: ~$2-5/month
- **AWS Lambda**: ~$1-3/month
- **DigitalOcean**: ~$5/month

## 🔐 **Security Considerations**

- Services are deployed with CORS enabled for your domain
- No authentication required (stateless processing)
- Images are processed in memory and not stored
- Consider adding API key authentication for production use

## 📈 **Scaling**

All platforms auto-scale based on demand:

- **Railway/Render**: Automatic scaling
- **Cloud Run**: 0-1000 instances
- **Lambda**: Concurrent executions
- **DigitalOcean**: Manual scaling

Choose based on your expected traffic and budget.
