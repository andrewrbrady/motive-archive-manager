# Canvas Extension Feature

## Current Status: ⚠️ Resolving OpenCV Dependencies

The canvas extension feature is currently experiencing an issue with OpenCV library dependencies in the Vercel production environment.

### Issue Description

- ✅ **Binary is found and executed** in production (`/var/task/extend_canvas`)
- ✅ **Temporary directory issue fixed** (now uses `/tmp/canvas-extension`)
- ✅ **File inclusion configured** properly with Next.js `outputFileTracingIncludes`
- ❌ **OpenCV shared libraries missing** in Vercel runtime environment

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

## Prerequisites

### OpenCV 4 Installation

The canvas extension feature requires OpenCV 4 to be installed on your system.

#### macOS (using Homebrew)

```bash
brew install opencv
```

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install libopencv-dev
```

#### CentOS/RHEL

```bash
sudo yum install opencv-devel
# or for newer versions:
sudo dnf install opencv-devel
```

## Compilation

To compile the C++ program, run the following command in the project root:

```bash
g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp `pkg-config --cflags --libs opencv4`
```

This will create an executable named `extend_canvas` in your project root directory.

## Usage

### Web Interface

1. Navigate to the Images page in your application
2. Hover over any image to see the action buttons
3. Click the "Expand" button (expand icon) to open the Canvas Extension modal
4. Configure the parameters:
   - **Desired Height**: Final canvas height in pixels (100-5000)
   - **Padding Percentage**: Extra space above & below the car as % of car height (0-1, default: 0.05)
   - **White Threshold**: Cut-off for "white" pixels (0-255, or -1 for auto-detection)
5. Click "Process Image" to generate the extended canvas
6. Download the processed image using the "Download" button

### Command Line Interface

You can also use the program directly from the command line:

```bash
./extend_canvas <input_path> <output_path> <desired_height> [padding_pct] [white_thresh]
```

**Parameters:**

- `input_path`: Path to the input image
- `output_path`: Path where the processed image will be saved
- `desired_height`: Final canvas height in pixels
- `padding_pct`: (Optional) Extra space above & below the car as % of car height (default: 0.05)
- `white_thresh`: (Optional) Cut-off for "white" pixels (0-255, or -1 for auto-detection, default: -1)

**Examples:**

```bash
# Basic usage with auto-detection
./extend_canvas input.jpg output.jpg 1200

# With custom padding
./extend_canvas input.jpg output.jpg 1200 0.1

# With custom white threshold
./extend_canvas input.jpg output.jpg 1200 0.05 200
```

## How It Works

1. **Auto-detection**: The program samples brightness at the image's central top & bottom stripes to derive a threshold that adapts to soft-box lighting variations
2. **Foreground Detection**: Uses the threshold to identify the car and its shadow
3. **Padding**: Adds configurable padding above and below the detected car
4. **Canvas Extension**: Stretches the remaining background areas to reach the target height
5. **Seamless Blending**: Maintains smooth gradients in the extended areas

## Troubleshooting

### "Canvas extension program not found"

- Ensure you have compiled the C++ program using the compilation command above
- Verify that the `extend_canvas` executable exists in your project root directory

### "Failed to process image"

- Check that OpenCV 4 is properly installed
- Verify that the input image is accessible and in a supported format
- Try adjusting the white threshold if auto-detection fails

### Compilation Errors

- Ensure OpenCV 4 development headers are installed
- Check that `pkg-config` can find OpenCV: `pkg-config --cflags --libs opencv4`
- On some systems, you might need to use `opencv` instead of `opencv4` in the pkg-config command

## Supported Image Formats

The program supports all image formats that OpenCV can read, including:

- JPEG (.jpg, .jpeg)
- PNG (.png)
- TIFF (.tiff, .tif)
- BMP (.bmp)
- And many others

## Performance Notes

- Processing time depends on image size and complexity
- The web interface has a 30-second timeout for processing
- For very large images, consider using the command-line interface directly
- Temporary files are automatically cleaned up after processing
