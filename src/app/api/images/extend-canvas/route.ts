import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const execAsync = promisify(exec);

interface ExtendCanvasRequest {
  imageUrl: string;
  desiredHeight: number;
  paddingPct: number;
  whiteThresh: number;
  uploadToCloudflare?: boolean;
  originalFilename?: string;
  originalCarId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendCanvasRequest = await request.json();
    const {
      imageUrl,
      desiredHeight,
      paddingPct,
      whiteThresh,
      uploadToCloudflare,
      originalFilename,
      originalCarId,
    } = body;

    // Validate input parameters
    if (!imageUrl || !desiredHeight) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (desiredHeight < 100 || desiredHeight > 5000) {
      return NextResponse.json(
        { error: "Desired height must be between 100 and 5000 pixels" },
        { status: 400 }
      );
    }

    if (paddingPct < 0 || paddingPct > 1) {
      return NextResponse.json(
        { error: "Padding percentage must be between 0 and 1" },
        { status: 400 }
      );
    }

    if (whiteThresh !== -1 && (whiteThresh < 0 || whiteThresh > 255)) {
      return NextResponse.json(
        { error: "White threshold must be -1 or between 0 and 255" },
        { status: 400 }
      );
    }

    // Create temporary directory for processing
    const tempDir = path.join("/tmp", "canvas-extension");
    await fs.mkdir(tempDir, { recursive: true });

    const sessionId = uuidv4();
    const inputPath = path.join(tempDir, `input_${sessionId}.jpg`);
    const outputPath = path.join(tempDir, `output_${sessionId}.jpg`);

    try {
      // Download the image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error("Failed to download image");
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(imageBuffer));

      // Check if extend_canvas executable exists
      const platform = process.platform;
      const executableName =
        platform === "darwin" ? "extend_canvas_macos" : "extend_canvas";
      const executablePath = path.join(process.cwd(), executableName);

      try {
        await fs.access(executablePath);
      } catch {
        // Check if we're in a production environment
        const isProduction = process.env.NODE_ENV === "production";
        const errorMessage = isProduction
          ? "Canvas extension feature is currently unavailable in production. The C++ processing program could not be compiled during deployment."
          : `Canvas extension program not found. Please ensure ${executableName} is compiled and available in the project root.`;

        return NextResponse.json(
          {
            error: errorMessage,
            details: isProduction
              ? "This feature requires OpenCV to be installed during the build process. Please check the deployment logs for compilation errors."
              : platform === "darwin"
                ? "Run: g++ -std=c++17 -O2 -Wall -o extend_canvas_macos extend_canvas.cpp `pkg-config --cflags --libs opencv4`"
                : "Run: g++ -std=c++17 -O2 -Wall -o extend_canvas extend_canvas.cpp `pkg-config --cflags --libs opencv4`",
          },
          { status: 503 } // Service Unavailable
        );
      }

      // Build command arguments
      const args = [
        inputPath,
        outputPath,
        desiredHeight.toString(),
        paddingPct.toString(),
        whiteThresh.toString(),
      ];

      // Execute the C++ program
      const command = `${executablePath} ${args.join(" ")}`;
      console.log("Executing command:", command);

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 30000, // 30 second timeout
        });

        if (stderr) {
          console.warn("Canvas extension stderr:", stderr);
        }

        console.log("Canvas extension stdout:", stdout);
      } catch (execError: any) {
        console.error("Canvas extension execution error:", execError);

        // Check if this is an OpenCV library dependency error
        if (
          execError &&
          (execError.stderr?.includes("error while loading shared libraries") ||
            execError.message?.includes(
              "error while loading shared libraries"
            )) &&
          (execError.stderr?.includes("libopencv") ||
            execError.message?.includes("libopencv"))
        ) {
          console.log(
            "🔄 OpenCV dependency error detected, falling back to JavaScript version..."
          );

          try {
            // Fall back to JavaScript implementation
            const fallbackResponse = await fetch(
              `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/images/extend-canvas-js`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  imageUrl,
                  desiredHeight,
                  paddingPct,
                  whiteThresh,
                  uploadToCloudflare,
                  originalFilename,
                  originalCarId,
                }),
              }
            );

            if (fallbackResponse.ok) {
              const fallbackResult = await fallbackResponse.json();
              console.log("✅ Successfully processed with JavaScript fallback");
              return NextResponse.json({
                ...fallbackResult,
                fallbackUsed: true,
                fallbackReason: "OpenCV dependency issue with C++ binary",
              });
            } else {
              throw new Error(
                `Fallback API failed: ${fallbackResponse.statusText}`
              );
            }
          } catch (fallbackError) {
            console.error(
              "Fallback to JavaScript version also failed:",
              fallbackError
            );
            throw new Error(
              `Both C++ binary and JavaScript fallback failed. C++ error: ${execError.message || execError}. Fallback error: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`
            );
          }
        }

        throw new Error(
          "Canvas extension binary is missing required OpenCV libraries. The binary needs to be recompiled with static linking for the Vercel environment. Please check the deployment documentation for instructions on creating a compatible binary."
        );
      }

      // Check if output file was created
      try {
        await fs.access(outputPath);
      } catch {
        throw new Error("Output image was not generated");
      }

      // Read the processed image
      const processedImageBuffer = await fs.readFile(outputPath);

      let result: any = {
        success: true,
        message: "Image processed successfully",
      };

      if (uploadToCloudflare) {
        try {
          // Validate Cloudflare environment variables
          if (
            !process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
            !process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN
          ) {
            throw new Error("Cloudflare credentials not configured");
          }

          // Create filename for the processed image
          const baseFilename = originalFilename || "image";
          const nameWithoutExt = baseFilename.replace(/\.[^/.]+$/, "");
          const processedFilename = `${nameWithoutExt}_extended_${desiredHeight}px.jpg`;

          // Create a File object from the buffer
          const processedFile = new File(
            [processedImageBuffer],
            processedFilename,
            {
              type: "image/jpeg",
            }
          );

          // Upload to Cloudflare
          const cloudflareForm = new FormData();
          cloudflareForm.append("file", processedFile);
          cloudflareForm.append("requireSignedURLs", "false");

          const cloudflareResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
              },
              body: cloudflareForm,
            }
          );

          if (!cloudflareResponse.ok) {
            throw new Error(
              `Cloudflare upload failed: ${cloudflareResponse.statusText}`
            );
          }

          const cloudflareResult = await cloudflareResponse.json();
          if (!cloudflareResult.success) {
            throw new Error(
              `Cloudflare API error: ${cloudflareResult.errors[0]?.message || "Unknown error"}`
            );
          }

          const cloudflareImageUrl =
            cloudflareResult.result.variants[0].replace(/\/public$/, "");

          // Store in MongoDB
          const db = await getDatabase();
          const now = new Date().toISOString();

          const imageDoc = {
            _id: new ObjectId(),
            cloudflareId: cloudflareResult.result.id,
            url: cloudflareImageUrl,
            filename: processedFilename,
            metadata: {
              category: "processed",
              processing: "canvas_extension",
              originalImage: imageUrl,
              parameters: {
                desiredHeight,
                paddingPct,
                whiteThresh,
              },
              processedAt: now,
            },
            carId: originalCarId || "",
            createdAt: now,
            updatedAt: now,
          };

          await db.collection("images").insertOne(imageDoc);

          // If this processed image is associated with a car, add it to the car's processedImageIds array
          if (originalCarId) {
            try {
              await db.collection("cars").updateOne(
                { _id: new ObjectId(originalCarId) },
                {
                  $addToSet: { processedImageIds: imageDoc._id },
                  $set: { updatedAt: now },
                }
              );
              console.log(
                `Added processed image ${imageDoc._id} to car ${originalCarId}`
              );
            } catch (carUpdateError) {
              console.error(
                "Failed to update car with processed image:",
                carUpdateError
              );
              // Don't fail the whole operation if car update fails
            }
          }

          result.cloudflareUpload = {
            success: true,
            imageId: cloudflareResult.result.id,
            imageUrl: cloudflareImageUrl,
            filename: processedFilename,
            mongoId: imageDoc._id.toString(),
          };

          console.log(
            "Successfully uploaded to Cloudflare and stored in MongoDB:",
            processedFilename
          );
        } catch (uploadError) {
          console.error("Failed to upload to Cloudflare:", uploadError);
          result.cloudflareUpload = {
            success: false,
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "Unknown upload error",
          };
        }
      }

      // Always return the base64 data URL as well
      const base64Image = processedImageBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;
      result.processedImageUrl = dataUrl;

      // Clean up temporary files
      await Promise.all([
        fs.unlink(inputPath).catch(() => {}),
        fs.unlink(outputPath).catch(() => {}),
      ]);

      return NextResponse.json(result);
    } catch (error) {
      // Clean up temporary files on error
      await Promise.all([
        fs.unlink(inputPath).catch(() => {}),
        fs.unlink(outputPath).catch(() => {}),
      ]);

      throw error;
    }
  } catch (error) {
    console.error("Canvas extension error:", error);

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            error: "Processing timeout. The image may be too large or complex.",
          },
          { status: 408 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
