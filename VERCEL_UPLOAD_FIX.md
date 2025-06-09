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

### 3. Fixed Next.js Configuration

Removed invalid experimental setting:

```javascript
// ❌ REMOVED - This property doesn't exist in Next.js 15.3.2
// experimental: {
//   isrMemoryCacheSize: 0,
// },

// ✅ FIXED - Empty or removed experimental section
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

- ✅ `vercel.json` - **Fixed invalid `maxRequestBodySize` properties** (removed schema-breaking config)
- ✅ `next.config.js` - **Removed invalid `isrMemoryCacheSize`** from experimental section
- ✅ `app/api/config.ts` - Created configuration constants
- ✅ `src/lib/cloudflare-image-loader.ts` - **Fixed missing `/public` variants** on URLs

### Root Causes Fixed:

1. **Build Error**: Removed invalid `maxRequestBodySize` from `vercel.json`
2. **Next.js Config Error**: Removed invalid `isrMemoryCacheSize`
3. **Image 404s**: Fixed custom loader to ensure URLs have proper variants

## What Was Actually Wrong

### ❌ Original Issues:

- **413 upload errors**: Files > 4.5MB (hardcoded Vercel limit)
- **Build failure**: Invalid `maxRequestBodySize` property in `vercel.json`
- **Invalid config warning**: `isrMemoryCacheSize` doesn't exist in Next.js 15.3.2
- **Image 404s**: URLs missing `/public` variant (e.g., `.../image-id` instead of `.../image-id/public`)

### ✅ Real Solutions:

- **For uploads**: Work within 4.5MB limit (use compression or direct cloud upload)
- **For build**: Use only valid `vercel.json` properties (`maxDuration`, `memory`)
- **For images**: Ensure all Cloudflare URLs have proper variants (`/public`, `/thumbnail`, etc.)

## Next Steps

1. **✅ Deploy and test** - Build should now succeed without errors
2. **Test image display** - Images should load with proper `/public` variants
3. **For large uploads**: Implement client-side compression or direct upload
4. **Monitor logs** for any remaining 413 errors on uploads > 4.5MB

The key takeaway: **Vercel's 4.5MB limit is hardcoded and cannot be changed**. The real solution is architectural - work within the limit or bypass Vercel Functions for large files.
