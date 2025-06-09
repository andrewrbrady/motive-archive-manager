# Vercel 413 Upload Error Fix

## Problem

Getting 413 "Payload Too Large" errors when uploading images on Vercel, while uploads work fine locally.

## Root Cause

Vercel has a **hardcoded request body size limit of 4.5MB** for all plans that **cannot be increased through configuration**. This is a platform limitation, not a configurable setting.

## Important: What Doesn't Work

❌ **`maxRequestBodySize` in `vercel.json`** - This property doesn't exist and causes schema validation errors  
❌ **Increasing limits through configuration** - The 4.5MB limit is hardcoded  
❌ **Different limits for different plans** - All plans have the same 4.5MB limit

## Solutions Applied

### 1. Optimized Function Configuration

Updated `vercel.json` to optimize performance for uploads:

```json
{
  "functions": {
    "app/api/images/upload/route.ts": {
      "maxDuration": 300,
      "memory": 1536
    }
  }
}
```

### 2. Architecture Changes for Large Files

Since we can't increase the 4.5MB limit, the solution is to avoid sending large files through Vercel Functions:

#### Option A: Client-Side Compression (Immediate Fix)

- Compress images on the client before upload
- Use libraries like `browser-image-compression`
- Target < 4MB file size after compression

#### Option B: Direct Cloud Upload (Recommended)

- Upload directly to Cloudflare Images/R2 from client
- Use pre-signed URLs for secure uploads
- Bypass Vercel Functions entirely for large files

#### Option C: Chunked Upload

- Split large files into < 4MB chunks
- Upload chunks separately
- Reassemble on the server

### 3. Updated Next.js Configuration

Added experimental settings to optimize memory usage:

```javascript
experimental: {
  isrMemoryCacheSize: 0, // Free up memory for uploads
},
```

## Real Solution: Implement Direct Upload

### Step 1: Update Upload Route for Token Generation

Instead of processing uploads, generate secure upload tokens:

```typescript
// app/api/images/upload/route.ts
export async function POST(request: Request) {
  // Generate pre-signed URL for direct Cloudflare upload
  // Return URL to client for direct upload
}
```

### Step 2: Client-Side Direct Upload

```typescript
// Upload directly to Cloudflare, not through Vercel
const response = await fetch(presignedUrl, {
  method: "PUT",
  body: file,
});
```

## After Deployment

1. **Test with 4MB files** - This is the practical limit
2. **Monitor function logs** for any remaining issues
3. **Implement compression** for files > 4MB
4. **Consider direct upload** for better performance

## Alternative Quick Fixes

### 1. Client-Side Image Compression

```javascript
import imageCompression from "browser-image-compression";

const compressedFile = await imageCompression(originalFile, {
  maxSizeMB: 3.5, // Stay under 4MB limit
  maxWidthOrHeight: 1920,
  useWebWorker: true,
});
```

### 2. Server-Side Image Optimization

- Use `sharp` to reduce image quality/size after upload
- Convert to more efficient formats (WebP, AVIF)
- Generate multiple sizes for responsive images

### 3. CDN Integration

- Upload small files through Vercel
- Redirect large file uploads to CDN
- Use Cloudflare Images API directly

## Error Types and Solutions

### 413 FUNCTION_PAYLOAD_TOO_LARGE

- **Cause**: Request body > 4.5MB
- **Solution**: Compress files or use direct upload

### Build Error: Invalid vercel.json

- **Cause**: Using `maxRequestBodySize` property
- **Solution**: Remove invalid properties from `vercel.json`

### Timeout Errors

- **Cause**: Long processing times
- **Solution**: Increase `maxDuration` in `vercel.json`

## Files Modified

### Configuration Files:

- ✅ `vercel.json` - Optimized function settings (removed invalid properties)
- ✅ `next.config.js` - Added memory optimization
- ✅ `app/api/config.ts` - Created configuration constants

### Runtime Files:

- ✅ `src/app/api/images/upload/route.ts` - Enhanced with proper exports

## Next Steps

1. **Test the current fix** with files < 4MB
2. **Implement client-side compression** for larger files
3. **Consider migrating to direct cloud upload** for the best user experience
4. **Monitor Vercel function logs** for any remaining issues

The key takeaway: **Work within the 4.5MB limit** rather than trying to increase it, as it's not configurable on Vercel.
