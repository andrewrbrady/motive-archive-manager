# Canvas Extension Feature

## Current Status: ✅ Working with JavaScript Fallback

The canvas extension feature is now **fully functional** with an automatic JavaScript fallback when the C++ binary encounters OpenCV dependency issues.

### How It Works

1. **Primary**: Attempts to use the optimized C++ binary with OpenCV
2. **Fallback**: Automatically switches to JavaScript implementation using Sharp library
3. **Seamless**: Users get the same functionality regardless of which method is used
4. **Transparent**: UI indicates when fallback is used

### Recent Updates

- ✅ **JavaScript fallback implemented** - Uses Sharp library for image processing
- ✅ **Automatic detection** - Switches to fallback when C++ binary fails
- ✅ **Full feature parity** - Upload, download, high-res processing all work
- ✅ **User feedback** - Toast messages indicate when fallback is used
- 🔄 **C++ binary optimization** - Working on minimal OpenCV build to resolve dependencies

### Current Behavior

When you use the canvas extension feature:

1. **First attempt**: Uses C++ binary with OpenCV (faster, more sophisticated)
2. **If C++ fails**: Automatically falls back to JavaScript version (reliable, good quality)
3. **User notification**: Success message indicates which method was used
4. **Same functionality**: Upload, download, and high-res processing work with both methods

### JavaScript Fallback Features

- ✅ **Canvas extension** - Adds white space above/below image to reach target height
- ✅ **Cloudflare upload** - Full integration with image storage
- ✅ **MongoDB storage** - Proper metadata and car association
- ✅ **High-resolution processing** - 2x and 4x multipliers supported
- ✅ **Download functionality** - Both standard and high-res downloads
- ✅ **Filename handling** - Descriptive filenames with `_js` suffix for fallback

### API Endpoints

- **Primary**: `/api/images/extend-canvas` - Tries C++, falls back to JavaScript
- **Direct**: `/api/images/extend-canvas-js` - JavaScript-only implementation

### C++ Binary Status

~~❌ **OpenCV shared libraries missing** in Vercel runtime environment~~

**Current Issue**: TBB (Threading Building Blocks) and OpenGL dependency conflicts during static linking

**Solution in Progress**: Building minimal OpenCV from source without problematic dependencies

### Previous Attempts

1. ✅ **Basic static linking** - Partial success but still had dependencies
2. ✅ **Enhanced static linking** - Added more libraries but hit TBB/OpenGL issues
3. 🔄 **Minimal OpenCV build** - Current approach: building OpenCV without TBB/OpenGL

### Files Involved

#### Core Implementation

- `src/app/api/images/extend-canvas/route.ts` - Primary API with fallback logic
- `src/app/api/images/extend-canvas-js/route.ts` - JavaScript fallback implementation
- `src/components/cars/CanvasExtensionModal.tsx` - UI with fallback indication

#### Binary Management

- `extend_canvas.cpp` - C++ source code (v5.1)
- `extend_canvas_linux` - Linux binary (current: 1.7MB, has dependency issues)
- `extend_canvas` - Production binary copy
- `.github/workflows/compile-canvas-extension.yml` - Automated compilation

#### Configuration

- `next.config.js` - File inclusion configuration
- `vercel.json` - Function timeout and memory settings
- `build-cpp.sh` - Environment-aware build script

## Technical Details

### C++ Program Features

- **Language**: C++17, single file, depends only on OpenCV 4
- **Compilation**: `g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp $(pkg-config --cflags --libs opencv4)`
- **CLI Signature**: `./extend_canvas <input_path> <output_path> <desired_height> [padding_pct] [white_thresh]`
- **Parameters**:
  - `desired_height` (pixels)
  - `padding_pct` (extra space as % of car height, default 0.05)
  - `white_thresh` (0-255 or -1 for auto-detection)

### JavaScript Implementation

- **Library**: Sharp (Node.js image processing)
- **Method**: Simple canvas extension with white background
- **Quality**: 95% JPEG quality
- **Limitations**: Less sophisticated than C++ version (no car/shadow detection)
- **Advantages**: No external dependencies, reliable in serverless environment

### Auto-Detection Algorithm (C++ Only)

- Samples brightness at image's central top & bottom stripes
- Derives threshold that adapts to soft-box lighting variations
- 5-point cushion below detected white level
- Threshold clamped between 180-250

### Processing Steps

1. **Download image** to temporary directory (`/tmp/canvas-extension`)
2. **Try C++ program** with specified parameters
3. **On failure**: Automatically call JavaScript fallback API
4. **Read processed image** and convert to base64
5. **Optionally upload** to Cloudflare with metadata
6. **Store in MongoDB** with processing parameters
7. **Associate with car** if `originalCarId` provided
8. **Clean up** temporary files

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
  },
  "app/api/images/extend-canvas-js/route.ts": {
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
- **Fallback Indication**: Toast messages show when JavaScript fallback is used

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
  fallbackUsed?: boolean, // true if JavaScript fallback was used
  fallbackReason?: string, // reason for fallback
  cloudflareUpload?: {
    success: boolean,
    imageUrl?: string,
    filename?: string,
    mongoId?: string
  }
}
```

## Next Steps

1. **Monitor fallback usage** - Track how often JavaScript fallback is used
2. **Complete minimal OpenCV build** - Resolve C++ binary dependency issues
3. **Performance comparison** - Compare C++ vs JavaScript processing quality
4. **Consider hybrid approach** - Use JavaScript as primary if quality is sufficient
