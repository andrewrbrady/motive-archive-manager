// extend_canvas.cpp  (v6.1)
// Added support for requestedWidth and requestedHeight parameters
// to constrain output dimensions while maintaining proper aspect ratios.
// Fixed: Final resize now preserves aspect ratio and centers content.
//
// Build:
//   g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp `pkg-config --cflags --libs opencv4`
// Usage:
//   ./extend_canvas <in> <out> <desired_h> [pad%] [white_thresh] [requested_w] [requested_h]
//      white_thresh:
//        • omit or  -1 → AUTO  (new center‑sample method)
//        •  0‑255         set manually
//      requested_w, requested_h:
//        • omit → use original width, desired height
//        • specify both → resize final output to fit dimensions while preserving aspect ratio
#include <opencv2/opencv.hpp>
#include <iostream>
#include <string>
#include <algorithm>

using namespace cv;

//---------------------------------------------------------------------
static int centerSampleThreshold(const Mat &img, int stripeH = 20, int stripeW = 40)
{
    int cx = img.cols / 2;
    int w = std::min({stripeW, cx - 1, img.cols - cx - 1});
    int h = std::min(stripeH, img.rows / 10);

    Rect topR(cx - w, 0, 2 * w + 1, h);
    Rect botR(cx - w, img.rows - h, 2 * w + 1, h);

    Mat grayTop, grayBot;
    cvtColor(img(topR), grayTop, COLOR_BGR2GRAY);
    cvtColor(img(botR), grayBot, COLOR_BGR2GRAY);

    double mTop = mean(grayTop)[0];
    double mBot = mean(grayBot)[0];

    int thr = static_cast<int>(std::min(mTop, mBot) - 5.0); // 5‑point cushion below white
    thr = std::clamp(thr, 180, 250);
    return thr;
}

static bool findForegroundBounds(const Mat &img, int &top, int &bot, int whiteThr)
{
    Mat mask;
    inRange(img, Scalar(whiteThr, whiteThr, whiteThr), Scalar(255, 255, 255), mask);
    bitwise_not(mask, mask);                  // foreground = 255
    reduce(mask, mask, 1, REDUCE_MAX, CV_8U); // rows collapsed

    top = -1;
    bot = -1;
    for (int r = 0; r < mask.rows; ++r)
    {
        if (mask.at<uchar>(r, 0))
        {
            if (top == -1)
                top = r;
            bot = r;
        }
    }
    return top != -1;
}

static Mat makeStrip(const Mat &src, int newH, int W)
{
    if (newH <= 0)
        return Mat();
    if (!src.empty())
    {
        Mat dst;
        resize(src, dst, Size(W, newH), 0, 0, INTER_AREA);
        return dst;
    }
    return Mat(newH, W, CV_8UC3, Scalar(255, 255, 255));
}
//---------------------------------------------------------------------
int main(int argc, char *argv[])
{
    if (argc < 4)
    {
        std::cerr << "Usage: " << argv[0] << " <in> <out> <desired_h> [pad%] [white_thresh|-1] [requested_w] [requested_h]" << std::endl;
        return 1;
    }

    std::string inP = argv[1];
    std::string outP = argv[2];
    int desiredH = std::stoi(argv[3]);
    double padPct = (argc >= 5 ? std::stod(argv[4]) : 0.05);
    int whiteThrArg = (argc >= 6 ? std::stoi(argv[5]) : -1);
    int requestedW = (argc >= 7 ? std::stoi(argv[6]) : -1);
    int requestedH = (argc >= 8 ? std::stoi(argv[7]) : -1);

    Mat img = imread(inP);
    if (img.empty())
    {
        std::cerr << "Cannot open input" << std::endl;
        return 1;
    }

    int whiteThr = (whiteThrArg >= 0 && whiteThrArg <= 255) ? whiteThrArg : centerSampleThreshold(img);

    int fgTop, fgBot;
    if (!findForegroundBounds(img, fgTop, fgBot, whiteThr))
    {
        std::cerr << "Foreground not found (try lowering threshold)." << std::endl;
        return 1;
    }

    int carH = fgBot - fgTop + 1;
    int pad = static_cast<int>(carH * padPct + 0.5);
    int cropTop = std::max(0, fgTop - pad);
    int cropBot = std::min(img.rows - 1, fgBot + pad);

    Mat carReg = img.rowRange(cropTop, cropBot + 1);

    // If already tall enough, centre crop and exit
    if (desiredH <= carReg.rows)
    {
        int yOff = (carReg.rows - desiredH) / 2;
        Mat result = carReg.rowRange(yOff, yOff + desiredH);

        // Apply final resize if requested dimensions are specified
        if (requestedW > 0 && requestedH > 0)
        {
            // Calculate the scaling factor to fit within requested dimensions while preserving aspect ratio
            double scaleX = static_cast<double>(requestedW) / result.cols;
            double scaleY = static_cast<double>(requestedH) / result.rows;
            double scale = std::min(scaleX, scaleY); // Use the smaller scale to maintain aspect ratio

            // Calculate the new dimensions that preserve aspect ratio
            int newWidth = static_cast<int>(result.cols * scale);
            int newHeight = static_cast<int>(result.rows * scale);

            // Resize while preserving aspect ratio
            Mat resized;
            resize(result, resized, Size(newWidth, newHeight), 0, 0, INTER_LANCZOS4);

            // Create a canvas with the requested dimensions and center the resized image
            Mat finalCanvas(requestedH, requestedW, result.type(), Scalar(255, 255, 255)); // White background

            // Calculate position to center the resized image
            int xOffset = (requestedW - newWidth) / 2;
            int yOffset = (requestedH - newHeight) / 2;

            // Ensure offsets are non-negative
            xOffset = std::max(0, xOffset);
            yOffset = std::max(0, yOffset);

            // Copy the resized image to the center of the final canvas
            if (xOffset + newWidth <= requestedW && yOffset + newHeight <= requestedH)
            {
                Rect roi(xOffset, yOffset, newWidth, newHeight);
                resized.copyTo(finalCanvas(roi));
                result = finalCanvas;
                std::cout << "Resized to requested dimensions with aspect ratio preserved: " << requestedW << "x" << requestedH << std::endl;
            }
            else
            {
                // Fallback: just resize without centering if there's an issue
                resize(result, result, Size(requestedW, requestedH), 0, 0, INTER_LANCZOS4);
                std::cout << "Resized to requested dimensions (fallback): " << requestedW << "x" << requestedH << std::endl;
            }
        }

        imwrite(outP, result);
        return 0;
    }

    int extra = desiredH - carReg.rows;
    int topH = extra / 2;
    int botH = extra - topH;
    int W = img.cols;

    Mat topSrc = cropTop > 0 ? img.rowRange(0, cropTop) : Mat();
    Mat botSrc = (cropBot + 1 < img.rows) ? img.rowRange(cropBot + 1, img.rows) : Mat();

    Mat topStrip = makeStrip(topSrc, topH, W);
    Mat botStrip = makeStrip(botSrc, botH, W);

    Mat canvas(desiredH, W, img.type());
    int y = 0;
    topStrip.copyTo(canvas.rowRange(y, y + topStrip.rows));
    y += topStrip.rows;
    carReg.copyTo(canvas.rowRange(y, y + carReg.rows));
    y += carReg.rows;
    botStrip.copyTo(canvas.rowRange(y, y + botStrip.rows));

    // Apply final resize if requested dimensions are specified
    if (requestedW > 0 && requestedH > 0)
    {
        // Calculate the scaling factor to fit within requested dimensions while preserving aspect ratio
        double scaleX = static_cast<double>(requestedW) / canvas.cols;
        double scaleY = static_cast<double>(requestedH) / canvas.rows;
        double scale = std::min(scaleX, scaleY); // Use the smaller scale to maintain aspect ratio

        // Calculate the new dimensions that preserve aspect ratio
        int newWidth = static_cast<int>(canvas.cols * scale);
        int newHeight = static_cast<int>(canvas.rows * scale);

        // Resize while preserving aspect ratio
        Mat resized;
        resize(canvas, resized, Size(newWidth, newHeight), 0, 0, INTER_LANCZOS4);

        // Create a canvas with the requested dimensions and center the resized image
        Mat finalCanvas(requestedH, requestedW, canvas.type(), Scalar(255, 255, 255)); // White background

        // Calculate position to center the resized image
        int xOffset = (requestedW - newWidth) / 2;
        int yOffset = (requestedH - newHeight) / 2;

        // Ensure offsets are non-negative
        xOffset = std::max(0, xOffset);
        yOffset = std::max(0, yOffset);

        // Copy the resized image to the center of the final canvas
        if (xOffset + newWidth <= requestedW && yOffset + newHeight <= requestedH)
        {
            Rect roi(xOffset, yOffset, newWidth, newHeight);
            resized.copyTo(finalCanvas(roi));
            canvas = finalCanvas;
            std::cout << "Extended canvas resized to requested dimensions with aspect ratio preserved: " << requestedW << "x" << requestedH << std::endl;
        }
        else
        {
            // Fallback: just resize without centering if there's an issue
            resize(canvas, canvas, Size(requestedW, requestedH), 0, 0, INTER_LANCZOS4);
            std::cout << "Extended canvas resized to requested dimensions (fallback): " << requestedW << "x" << requestedH << std::endl;
        }
    }

    imwrite(outP, canvas);
    std::cout << "Saved (thr=" << whiteThr << ") to " << outP << std::endl;
    return 0;
}
