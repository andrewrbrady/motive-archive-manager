#include <opencv2/opencv.hpp>
#include <iostream>
#include <string>
#include <algorithm>

using namespace cv;

Scalar hexToScalar(const std::string &hex)
{
    unsigned int r, g, b;
    if (hex[0] == '#')
    {
        sscanf(hex.c_str() + 1, "%02x%02x%02x", &r, &g, &b);
    }
    else
    {
        sscanf(hex.c_str(), "%02x%02x%02x", &r, &g, &b);
    }
    return Scalar(b, g, r); // OpenCV uses BGR
}

int main(int argc, char **argv)
{
    std::string inputPath, outputPath, hexColor = "#000000";
    int canvasWidth = 1920, canvasHeight = 1080;
    float paddingPercent = 0;

    // Parse command line arguments
    for (int i = 1; i < argc; ++i)
    {
        std::string arg = argv[i];
        if (arg == "--input" && i + 1 < argc)
            inputPath = argv[++i];
        else if (arg == "--output" && i + 1 < argc)
            outputPath = argv[++i];
        else if (arg == "--width" && i + 1 < argc)
            canvasWidth = std::stoi(argv[++i]);
        else if (arg == "--height" && i + 1 < argc)
            canvasHeight = std::stoi(argv[++i]);
        else if (arg == "--padding" && i + 1 < argc)
            paddingPercent = std::stof(argv[++i]);
        else if (arg == "--color" && i + 1 < argc)
            hexColor = argv[++i];
    }

    // Validate inputs
    if (inputPath.empty() || outputPath.empty())
    {
        std::cerr << "Error: Input and output paths are required.\n";
        return 1;
    }

    if (canvasWidth <= 0 || canvasHeight <= 0)
    {
        std::cerr << "Error: Canvas dimensions must be positive.\n";
        return 1;
    }

    if (paddingPercent < 0 || paddingPercent >= 50)
    {
        std::cerr << "Error: Padding percent must be between 0 and 50.\n";
        return 1;
    }

    // Load input image
    Mat input = imread(inputPath);
    if (input.empty())
    {
        std::cerr << "Error: Could not read input image from " << inputPath << "\n";
        return 1;
    }

    // Calculate padding
    int padX = static_cast<int>(canvasWidth * paddingPercent / 100.0);
    int padY = static_cast<int>(canvasHeight * paddingPercent / 100.0);
    int contentWidth = canvasWidth - 2 * padX;
    int contentHeight = canvasHeight - 2 * padY;

    // Ensure content area is valid
    if (contentWidth <= 0 || contentHeight <= 0)
    {
        std::cerr << "Error: Padding too large for canvas size.\n";
        return 1;
    }

    // Calculate target dimensions while preserving aspect ratio
    double inputRatio = static_cast<double>(input.cols) / input.rows;
    double contentRatio = static_cast<double>(contentWidth) / contentHeight;

    int targetWidth, targetHeight;
    if (inputRatio > contentRatio)
    {
        // Image is wider than content area
        targetWidth = contentWidth;
        targetHeight = static_cast<int>(contentWidth / inputRatio);
    }
    else
    {
        // Image is taller than content area
        targetHeight = contentHeight;
        targetWidth = static_cast<int>(contentHeight * inputRatio);
    }

    // Ensure target dimensions are valid
    targetWidth = std::max(1, std::min(targetWidth, canvasWidth));
    targetHeight = std::max(1, std::min(targetHeight, canvasHeight));

    // Resize the input image
    Mat resized;
    resize(input, resized, Size(targetWidth, targetHeight), 0, 0, INTER_AREA);

    // Create canvas with background color
    Mat canvas(canvasHeight, canvasWidth, input.type(), hexToScalar(hexColor));

    // Calculate centered position
    int xOffset = (canvasWidth - targetWidth) / 2;
    int yOffset = (canvasHeight - targetHeight) / 2;

    // Ensure offsets are within bounds
    xOffset = std::max(0, std::min(xOffset, canvasWidth - targetWidth));
    yOffset = std::max(0, std::min(yOffset, canvasHeight - targetHeight));

    // Ensure the region of interest is valid
    if (xOffset + targetWidth <= canvasWidth && yOffset + targetHeight <= canvasHeight)
    {
        Rect roi(xOffset, yOffset, targetWidth, targetHeight);
        resized.copyTo(canvas(roi));
    }
    else
    {
        std::cerr << "Error: Calculated region exceeds canvas bounds.\n";
        return 1;
    }

    // Save the result
    if (!imwrite(outputPath, canvas))
    {
        std::cerr << "Error: Could not write output image to " << outputPath << "\n";
        return 1;
    }

    std::cout << "Matte created successfully: " << outputPath << std::endl;
    return 0;
}