# Canvas Extension Feature

This feature allows you to automatically extend the vertical canvas of studio car photos. The system detects the car and its shadow, preserves configurable padding, then stretches the remaining background to reach a target height while maintaining seamless white/grey gradients.

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
