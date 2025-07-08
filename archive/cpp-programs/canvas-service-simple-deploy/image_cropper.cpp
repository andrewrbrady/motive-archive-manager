#include <opencv2/opencv.hpp>
#include <iostream>
#include <string>
#include <algorithm>

using namespace cv;

int main(int argc, char **argv)
{
    std::string inputPath, outputPath;
    int cropX = 0, cropY = 0, cropWidth = 0, cropHeight = 0;
    int outputWidth = 1080, outputHeight = 1920; // Default to 9:16 vertical format
    double scale = 1.0;

    // Parse command line arguments
    for (int i = 1; i < argc; ++i)
    {
        std::string arg = argv[i];
        if (arg == "--input" && i + 1 < argc)
            inputPath = argv[++i];
        else if (arg == "--output" && i + 1 < argc)
            outputPath = argv[++i];
        else if (arg == "--crop-x" && i + 1 < argc)
            cropX = std::stoi(argv[++i]);
        else if (arg == "--crop-y" && i + 1 < argc)
            cropY = std::stoi(argv[++i]);
        else if (arg == "--crop-width" && i + 1 < argc)
            cropWidth = std::stoi(argv[++i]);
        else if (arg == "--crop-height" && i + 1 < argc)
            cropHeight = std::stoi(argv[++i]);
        else if (arg == "--output-width" && i + 1 < argc)
            outputWidth = std::stoi(argv[++i]);
        else if (arg == "--output-height" && i + 1 < argc)
            outputHeight = std::stoi(argv[++i]);
        else if (arg == "--scale" && i + 1 < argc)
            scale = std::stod(argv[++i]);
    }

    // Validate inputs
    if (inputPath.empty() || outputPath.empty())
    {
        std::cerr << "Error: Input and output paths are required.\n";
        std::cerr << "Usage: " << argv[0] << " --input <path> --output <path> [options]\n";
        std::cerr << "Options:\n";
        std::cerr << "  --crop-x <x>           X coordinate of crop area (default: 0)\n";
        std::cerr << "  --crop-y <y>           Y coordinate of crop area (default: 0)\n";
        std::cerr << "  --crop-width <width>   Width of crop area (default: full width)\n";
        std::cerr << "  --crop-height <height> Height of crop area (default: full height)\n";
        std::cerr << "  --output-width <width> Output image width (default: 1080)\n";
        std::cerr << "  --output-height <height> Output image height (default: 1920)\n";
        std::cerr << "  --scale <factor>       Scale factor for the cropped image (default: 1.0)\n";
        return 1;
    }

    if (outputWidth <= 0 || outputHeight <= 0)
    {
        std::cerr << "Error: Output dimensions must be positive.\n";
        return 1;
    }

    if (scale <= 0)
    {
        std::cerr << "Error: Scale factor must be positive.\n";
        return 1;
    }

    // Load input image
    Mat input = imread(inputPath);
    if (input.empty())
    {
        std::cerr << "Error: Could not read input image from " << inputPath << "\n";
        return 1;
    }

    // Set default crop dimensions if not specified
    if (cropWidth <= 0)
        cropWidth = input.cols;
    if (cropHeight <= 0)
        cropHeight = input.rows;

    // Validate crop parameters
    if (cropX < 0 || cropY < 0 ||
        cropX + cropWidth > input.cols ||
        cropY + cropHeight > input.rows)
    {
        std::cerr << "Error: Crop area exceeds image boundaries.\n";
        std::cerr << "Image size: " << input.cols << "x" << input.rows << "\n";
        std::cerr << "Crop area: " << cropX << "," << cropY << " " << cropWidth << "x" << cropHeight << "\n";
        return 1;
    }

    // Extract the crop region
    Rect cropRect(cropX, cropY, cropWidth, cropHeight);
    Mat cropped = input(cropRect);

    // Apply scaling if specified
    Mat scaled;
    if (scale != 1.0)
    {
        int scaledWidth = static_cast<int>(cropped.cols * scale);
        int scaledHeight = static_cast<int>(cropped.rows * scale);
        resize(cropped, scaled, Size(scaledWidth, scaledHeight), 0, 0, INTER_LANCZOS4);
    }
    else
    {
        scaled = cropped.clone();
    }

    // Create output canvas
    Mat output(outputHeight, outputWidth, input.type(), Scalar(0, 0, 0)); // Black background

    // Calculate position to center the scaled image in the output canvas
    int xOffset = (outputWidth - scaled.cols) / 2;
    int yOffset = (outputHeight - scaled.rows) / 2;

    // Ensure the scaled image fits in the output canvas
    if (scaled.cols > outputWidth || scaled.rows > outputHeight)
    {
        // If the scaled image is larger than output canvas, resize it to fit
        double fitScale = std::min(
            static_cast<double>(outputWidth) / scaled.cols,
            static_cast<double>(outputHeight) / scaled.rows);

        int fitWidth = static_cast<int>(scaled.cols * fitScale);
        int fitHeight = static_cast<int>(scaled.rows * fitScale);

        resize(scaled, scaled, Size(fitWidth, fitHeight), 0, 0, INTER_LANCZOS4);

        // Recalculate offsets
        xOffset = (outputWidth - scaled.cols) / 2;
        yOffset = (outputHeight - scaled.rows) / 2;
    }

    // Ensure offsets are non-negative
    xOffset = std::max(0, xOffset);
    yOffset = std::max(0, yOffset);

    // Copy the scaled image to the output canvas
    if (xOffset + scaled.cols <= outputWidth && yOffset + scaled.rows <= outputHeight)
    {
        Rect roi(xOffset, yOffset, scaled.cols, scaled.rows);
        scaled.copyTo(output(roi));
    }
    else
    {
        std::cerr << "Error: Scaled image exceeds output canvas bounds.\n";
        return 1;
    }

    // Save the result
    if (!imwrite(outputPath, output))
    {
        std::cerr << "Error: Could not write output image to " << outputPath << "\n";
        return 1;
    }

    std::cout << "Image cropped successfully: " << outputPath << std::endl;
    std::cout << "Original size: " << input.cols << "x" << input.rows << std::endl;
    std::cout << "Crop area: " << cropX << "," << cropY << " " << cropWidth << "x" << cropHeight << std::endl;
    std::cout << "Scale factor: " << scale << std::endl;
    std::cout << "Output size: " << outputWidth << "x" << outputHeight << std::endl;

    return 0;
}