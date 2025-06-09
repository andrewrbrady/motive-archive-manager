# Vercel 413 Upload Error Fix

## Problem

Getting 413 "Payload Too Large" errors when uploading images on Vercel, while uploads work fine locally.

## Root Cause

Vercel has default request body size limits that are lower than what your application needs for image uploads. The default limit is around 4.5MB for the Pro plan and 1MB for the Hobby plan.

## Solution Applied

### 1. Updated `vercel.json` Configuration

Added `maxRequestBodySize` to all image upload API routes:

```json
{
  "functions": {
    "app/api/images/upload/route.ts": {
      "maxDuration": 300,
      "memory": 1536,
      "maxRequestBodySize": "50mb"
    },
    "app/api/cloud-upload/route.ts": {
      "maxDuration": 60,
      "memory": 1536,
      "maxRequestBodySize": "25mb"
    }
    // ... other routes with 25mb or 15mb limits
  }
}
```

### 2. Updated Next.js Configuration

Added experimental settings to `next.config.js`:

```javascript
experimental: {
  isrMemoryCacheSize: 0, // Disable ISR cache to free up memory for uploads
},
```

### 3. Created API Configuration File

Added `app/api/config.ts` with consistent upload limits across all routes.

### 4. Enhanced Runtime Configuration

Updated upload routes with proper runtime and region settings.

## Limits Set

- **Main upload route**: 50MB total request size
- **Image processing routes**: 25MB total request size
- **Thumbnail routes**: 15MB total request size
- **Individual file limit**: 8MB per file (already enforced in code)

## After Deployment

1. **Redeploy to Vercel** - The `vercel.json` changes only take effect after a new deployment
2. **Test with different file sizes** to ensure the limits work correctly
3. **Monitor function logs** in Vercel dashboard for any remaining issues

## Troubleshooting

If you still get 413 errors after deployment:

### Check Your Vercel Plan Limits

- **Hobby Plan**: Max 1MB request body (not suitable for image uploads)
- **Pro Plan**: Max 4.5MB by default, configurable up to 50MB
- **Enterprise**: Higher limits available

### Verify Deployment

1. Go to Vercel Dashboard > Your Project > Functions
2. Check that your upload functions show the correct `maxRequestBodySize`
3. Look at the function logs during failed uploads

### Test with Smaller Files First

1. Try uploading a 1MB image first
2. Gradually increase file size to find the actual limit
3. Check browser network tab for exact error details

### Alternative Solutions

If the limits still don't work:

1. **Client-side compression**: Compress images before upload
2. **Chunked uploads**: Split large files into smaller chunks
3. **Direct Cloudflare upload**: Use Cloudflare's direct upload API
4. **Upgrade Vercel plan**: Consider Pro or Enterprise plan

## Code Changes Made

### Files Modified:

- `vercel.json` - Added body size limits
- `next.config.js` - Added experimental settings
- `src/app/api/images/upload/route.ts` - Added region preference
- `app/api/config.ts` - New configuration file

### Files NOT Modified:

- Upload logic remains the same
- Error handling unchanged
- Client-side code unchanged

The fix is purely configuration-based and doesn't change your application logic.
