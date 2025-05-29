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
  processingMethod?: "cloud" | "local";
  uploadToCloudflare?: boolean;
  originalFilename?: string;
  originalCarId?: string;
  requestedWidth?: number;
  requestedHeight?: number;
  scaleMultiplier?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendCanvasRequest = await request.json();
    const {
      imageUrl,
      desiredHeight,
      paddingPct,
      whiteThresh,
      processingMethod,
      uploadToCloudflare,
      originalFilename,
      originalCarId,
      requestedWidth,
      requestedHeight,
      scaleMultiplier,
    } = body;

    // Debug logging
    console.log("🔍 Canvas extension request received:", {
      processingMethod,
      hasImageUrl: !!imageUrl,
      desiredHeight,
      paddingPct,
      whiteThresh,
      uploadToCloudflare,
    });

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
      // Try the remote canvas extension service if configured and requested
      const remoteServiceUrl = process.env.CANVAS_EXTENSION_SERVICE_URL;
      const shouldTryRemote = processingMethod !== "local" && remoteServiceUrl;

      console.log("🔍 Remote service decision:", {
        processingMethod,
        hasRemoteServiceUrl: !!remoteServiceUrl,
        shouldTryRemote,
        processingMethodNotLocal: processingMethod !== "local",
      });

      if (shouldTryRemote) {
        try {
          console.log("🌐 Trying remote canvas extension service...");
          console.log("🔗 Remote service URL:", remoteServiceUrl);

          const remoteResponse = await fetch(
            `${remoteServiceUrl}/extend-canvas`,
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
              }),
            }
          );

          if (remoteResponse.ok) {
            const remoteResult = await remoteResponse.json();
            console.log(
              "✅ Successfully processed with remote Cloud Run service"
            );

            // If uploadToCloudflare is requested, upload the result
            if (uploadToCloudflare && remoteResult.processedImageUrl) {
              try {
                // Convert base64 data URL to buffer
                const base64Data = remoteResult.processedImageUrl.replace(
                  /^data:image\/[a-z]+;base64,/,
                  ""
                );
                const imageBuffer = Buffer.from(base64Data, "base64");

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

                // Generate filename based on the new naming convention
                let processedFilename;
                if (scaleMultiplier && scaleMultiplier >= 2) {
                  const reqWidth =
                    requestedWidth || Math.round((desiredHeight * 16) / 9); // Default aspect ratio
                  const reqHeight = requestedHeight || desiredHeight;
                  processedFilename = `${nameWithoutExt}-EXTENDED-${reqWidth}x${reqHeight}-${scaleMultiplier}X.jpg`;
                } else {
                  const reqWidth =
                    requestedWidth || Math.round((desiredHeight * 16) / 9);
                  const reqHeight = requestedHeight || desiredHeight;
                  processedFilename = `${nameWithoutExt}-EXTENDED-${reqWidth}x${reqHeight}.jpg`;
                }

                // Create a File object from the buffer
                const processedFile = new File(
                  [imageBuffer],
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
                  carId: originalCarId ? new ObjectId(originalCarId) : null,
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

                // Return the result with Cloudflare upload info
                return NextResponse.json({
                  success: true,
                  message:
                    "Image processed successfully with Cloud Run service and uploaded to Cloudflare",
                  processedImageUrl: remoteResult.processedImageUrl,
                  remoteServiceUsed: true,
                  cloudflareUpload: {
                    success: true,
                    imageId: cloudflareResult.result.id,
                    imageUrl: cloudflareImageUrl,
                    filename: processedFilename,
                    mongoId: imageDoc._id.toString(),
                  },
                });
              } catch (uploadError) {
                console.error(
                  "Failed to upload Cloud Run result to Cloudflare:",
                  uploadError
                );
                return NextResponse.json({
                  success: true,
                  message:
                    "Image processed successfully with Cloud Run service",
                  processedImageUrl: remoteResult.processedImageUrl,
                  remoteServiceUsed: true,
                  cloudflareUpload: {
                    success: false,
                    error:
                      uploadError instanceof Error
                        ? uploadError.message
                        : "Unknown upload error",
                  },
                });
              }
            }

            // Return the result with additional metadata (no Cloudflare upload)
            return NextResponse.json({
              success: true,
              message: "Image processed successfully with Cloud Run service",
              processedImageUrl: remoteResult.processedImageUrl,
              remoteServiceUsed: true,
              uploadToCloudflare,
              originalFilename,
              originalCarId,
            });
          } else {
            const errorText = await remoteResponse.text();
            console.log(
              "⚠️ Remote service failed:",
              remoteResponse.status,
              errorText
            );

            // If user explicitly chose cloud but it failed, don't fall back to local
            if (processingMethod === "cloud") {
              throw new Error(`Cloud Run service failed: ${errorText}`);
            }

            console.log("⚠️ Falling back to local binary...");
          }
        } catch (remoteError) {
          console.log("⚠️ Remote service error:", remoteError);

          // If user explicitly chose cloud but it failed, don't fall back to local
          if (processingMethod === "cloud") {
            throw remoteError;
          }

          console.log("⚠️ Trying local binary...");
        }
      } else if (processingMethod === "local") {
        console.log(
          "🔧 Local processing explicitly requested, skipping remote service..."
        );
      } else {
        console.log(
          "🔧 No remote service URL configured, using local binary..."
        );
      }

      // Download the image
      console.log("🔍 Attempting to download image from:", imageUrl);
      let imageResponse = await fetch(imageUrl);
      console.log("🔍 Image download response:", {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        ok: imageResponse.ok,
        headers: Object.fromEntries(imageResponse.headers.entries()),
      });

      // If the enhanced URL fails, try the original URL without parameters
      if (
        !imageResponse.ok &&
        imageUrl.includes("imagedelivery.net") &&
        imageUrl.includes(",")
      ) {
        const originalUrl = imageUrl.replace(/\/[^\/]*$/, "/public");
        console.log(
          "🔍 Enhanced URL failed, trying original URL:",
          originalUrl
        );
        imageResponse = await fetch(originalUrl);
        console.log("🔍 Original URL response:", {
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          ok: imageResponse.ok,
        });
      }

      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`
        );
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
          throw new Error(
            "Canvas extension binary is missing required OpenCV libraries. Please use the Cloud Run service instead, or ensure OpenCV is properly installed for local processing."
          );
        }

        throw new Error(
          `Canvas extension execution failed: ${execError.message || execError}`
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

          // Generate filename based on the new naming convention
          let processedFilename;
          if (scaleMultiplier && scaleMultiplier >= 2) {
            const reqWidth =
              requestedWidth || Math.round((desiredHeight * 16) / 9); // Default aspect ratio
            const reqHeight = requestedHeight || desiredHeight;
            processedFilename = `${nameWithoutExt}-EXTENDED-${reqWidth}x${reqHeight}-${scaleMultiplier}X.jpg`;
          } else {
            const reqWidth =
              requestedWidth || Math.round((desiredHeight * 16) / 9);
            const reqHeight = requestedHeight || desiredHeight;
            processedFilename = `${nameWithoutExt}-EXTENDED-${reqWidth}x${reqHeight}.jpg`;
          }

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
            carId: originalCarId ? new ObjectId(originalCarId) : null,
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
