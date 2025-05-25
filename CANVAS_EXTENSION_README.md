# Canvas Extension Feature

## Current Status: ✅ Ready for Testing

The canvas extension feature has been updated with a new statically-linked binary that should resolve the OpenCV dependency issues in production.

### Recent Updates

- ✅ **New binary deployed** - Updated from 27KB to 1.7MB with static linking
- ✅ **GitHub Action completed** - Compiled with `-static-libgcc -static-libstdc++`
- ✅ **Production files updated** - Both `extend_canvas` and `extend_canvas_linux` deployed
- ✅ **Local development working** - macOS binary compiled and functional

### Binary Status

- `extend_canvas` (1.7MB) - Linux binary for production (statically linked)
- `extend_canvas_linux` (1.7MB) - Source Linux binary from GitHub Action
- Local macOS binary available for development

### Next Steps

1. **Test in production** - Try the canvas extension feature
2. **Monitor for errors** - Check if OpenCV dependency issues are resolved
3. **Verify functionality** - Ensure image processing works correctly

### Previous Issue (Resolved)

~~❌ **OpenCV shared libraries missing** in Vercel runtime environment~~

```
error while loading shared libraries: libopencv_imgcodecs.so.406: cannot open shared object file: No such file or directory
```

**Solution Applied**: Recompiled with static linking to include OpenCV libraries in the binary.

### Issue Description

- ✅ **Binary is found and executed** in production (`/var/task/extend_canvas`)
- ✅ **Temporary directory issue fixed** (now uses `/tmp/canvas-extension`)
- ✅ **File inclusion configured** properly with Next.js `outputFileTracingIncludes`

### Error Details

```
error while loading shared libraries: libopencv_imgcodecs.so.406: cannot open shared object file: No such file or directory
```

### Solution in Progress

We're recompiling the binary with static linking to include OpenCV libraries directly in the executable:

1. **Updated GitHub Action** to compile with `-static-libgcc -static-libstdc++`
2. **Added library dependency checking** in the compilation process
3. **Improved error handling** in the API to provide better feedback

### Files Involved

- `extend_canvas.cpp` - C++ source code (v5.1)
- `extend_canvas_linux` - Linux binary (needs recompilation)
- `extend_canvas` - Copy for API compatibility
- `.github/workflows/compile-canvas-extension.yml` - Automated compilation
- `src/app/api/images/extend-canvas/route.ts` - API endpoint
- `next.config.js` - File inclusion configuration

### Next Steps

1. Wait for GitHub Action to complete with new binary
2. Download and commit the updated binary
3. Test the canvas extension in production

### Alternative Solutions

If static linking proves difficult, we could:

- Use a containerized approach with Docker
- Implement a web-based image processing service
- Create a simpler version without OpenCV dependencies

## Technical Details

### C++ Program Features

- **Language**: C++17, single file, depends only on OpenCV 4
- **Compilation**: `g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp $(pkg-config --cflags --libs opencv4)`
- **CLI Signature**: `./extend_canvas <input_path> <output_path> <desired_height> [padding_pct] [white_thresh]`
- **Parameters**:
  - `desired_height` (pixels)
  - `padding_pct` (extra space as % of car height, default 0.05)
  - `white_thresh` (0-255 or -1 for auto-detection)

### Auto-Detection Algorithm

- Samples brightness at image's central top & bottom stripes
- Derives threshold that adapts to soft-box lighting variations
- 5-point cushion below detected white level
- Threshold clamped between 180-250

### Processing Steps

1. **Download image** to temporary directory (`/tmp/canvas-extension`)
2. **Execute C++ program** with specified parameters
3. **Read processed image** and convert to base64
4. **Optionally upload** to Cloudflare with metadata
5. **Store in MongoDB** with processing parameters
6. **Associate with car** if `originalCarId` provided
7. **Clean up** temporary files

### API Configuration

```javascript
// next.config.js
experimental: {
  outputFileTracingIncludes: {
    '/api/images/extend-canvas': ['./extend_canvas', './extend_canvas_linux'],
  },
}
```

### Vercel Configuration

```json
// vercel.json
"functions": {
  "app/api/images/extend-canvas/route.ts": {
    "maxDuration": 60,
    "memory": 1536
  }
}
```

## Usage

### Frontend Integration

- **Modal Component**: `CanvasExtensionModal.tsx`
- **Image Cards**: Enhanced with "Expand" button
- **Gallery Integration**: Handler passed through components
- **Preset Buttons**: 9:16, 4:5, 1:1 aspect ratios
- **Real-time Preview**: Updates with Cloudflare parameters
- **High-res Processing**: 2x and 4x multipliers available

### API Endpoint

```typescript
POST /api/images/extend-canvas
{
  imageUrl: string,
  desiredHeight: number,
  paddingPct: number,
  whiteThresh: number,
  uploadToCloudflare?: boolean,
  originalFilename?: string,
  originalCarId?: string
}
```

### Response Format

```typescript
{
  success: boolean,
  processedImageUrl: string, // base64 data URL
  cloudflareUpload?: {
    success: boolean,
    imageUrl?: string,
    filename?: string,
    mongoId?: string
  }
}
```
