# 🚀 Motive Archive Manager - Deployment Guide

## Environment Configuration

### Canvas Extension Service URLs

This application uses different Canvas Extension Service endpoints for different environments:

| Environment     | URL                                                     | Configuration File |
| --------------- | ------------------------------------------------------- | ------------------ |
| **Development** | `http://localhost:8080`                                 | `.env.local`       |
| **Production**  | `https://canvas-service-public-s6vo3k273a-uc.a.run.app` | `.env`             |

### Development Setup

#### Local Docker Canvas Service

For local development, we use a Docker container that runs the same canvas service as production:

```bash
# Start the local canvas service
./scripts/dev-docker.sh start

# Check status
./scripts/dev-docker.sh status

# View logs
./scripts/dev-docker.sh logs

# Stop service
./scripts/dev-docker.sh stop
```

The local service provides these endpoints:

- `http://localhost:8080/health` - Health check
- `http://localhost:8080/extend-canvas` - Canvas extension
- `http://localhost:8080/create-matte` - Matte generation
- `http://localhost:8080/crop-image` - Image cropping

### Production Deployment

#### Vercel Deployment

When deploying to Vercel, the application automatically uses the production Canvas Extension Service URL from the `.env` file.

**Important:** Make sure your Vercel project has the correct environment variables:

```bash
# Set production canvas service URL in Vercel
vercel env add CANVAS_EXTENSION_SERVICE_URL production
# Value: https://canvas-service-public-s6vo3k273a-uc.a.run.app
```

#### Environment File Priority

Next.js loads environment variables in this order:

1. `.env.local` (local development - ignored by Git)
2. `.env.production` (production specific)
3. `.env` (default/fallback)

This ensures:

- ✅ Local development uses Docker service (`localhost:8080`)
- ✅ Production uses Cloud Run service (`canvas-service-public-s6vo3k273a-uc.a.run.app`)

### Canvas Service Features

The canvas service provides three main image processing features:

#### 1. **Image Matte Generation**

- Creates background removal/matting effects
- Endpoint: `/create-matte`
- Supported formats: JPG, PNG, WebP

#### 2. **Canvas Extension**

- Extends image canvas with AI-generated content
- Endpoint: `/extend-canvas`
- Configurable extension directions and sizes

#### 3. **Image Cropping**

- Intelligent image cropping with Sharp.js
- Endpoint: `/crop-image`
- Supports custom crop coordinates and aspect ratios

### Troubleshooting

#### Local Development Issues

```bash
# If Docker service won't start
./scripts/dev-docker.sh rebuild

# If service is unhealthy
./scripts/dev-docker.sh logs

# Clean restart
./scripts/dev-docker.sh clean
docker build -f Dockerfile.canvas-service -t motive-canvas-service .
./scripts/dev-docker.sh start
```

#### Production Issues

1. **Verify Canvas Service URL**: Check that the Cloud Run service is responding

   ```bash
   curl -I https://canvas-service-public-s6vo3k273a-uc.a.run.app/health
   ```

2. **Check Vercel Environment Variables**: Ensure `CANVAS_EXTENSION_SERVICE_URL` is set correctly

3. **Monitor Logs**: Check Vercel function logs for any canvas service connection errors

### Security Notes

- Canvas service URLs are not sensitive but should be environment-appropriate
- Local Docker service only accepts connections from localhost
- Production service should have proper CORS and authentication configured
