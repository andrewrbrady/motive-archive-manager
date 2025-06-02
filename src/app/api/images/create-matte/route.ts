import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const execAsync = promisify(exec);

interface CreateMatteRequest {
  imageUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  paddingPercent: number;
  matteColor: string;
  uploadToCloudflare?: boolean;
  originalFilename?: string;
  originalCarId?: string;
  processingMethod?: "cloud" | "local";
  requestedWidth?: number;
  requestedHeight?: number;
  scaleMultiplier?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMatteRequest = await request.json();
    const {
      imageUrl,
      canvasWidth,
      canvasHeight,
      paddingPercent,
      matteColor,
      uploadToCloudflare,
      originalFilename,
      originalCarId,
      processingMethod = "cloud",
      requestedWidth,
      requestedHeight,
      scaleMultiplier,
    } = body;

    // Validate input parameters
    if (!imageUrl || !canvasWidth || !canvasHeight) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (canvasWidth < 100 || canvasWidth > 5000) {
      return NextResponse.json(
        { error: "Canvas width must be between 100 and 5000 pixels" },
        { status: 400 }
      );
    }

    if (canvasHeight < 100 || canvasHeight > 5000) {
      return NextResponse.json(
        { error: "Canvas height must be between 100 and 5000 pixels" },
        { status: 400 }
      );
    }

    if (paddingPercent < 0 || paddingPercent > 50) {
      return NextResponse.json(
        { error: "Padding percentage must be between 0 and 50" },
        { status: 400 }
      );
    }

    // Validate hex color format
    if (!/^#[0-9A-F]{6}$/i.test(matteColor)) {
      return NextResponse.json(
        { error: "Matte color must be a valid hex color (e.g., #000000)" },
        { status: 400 }
      );
    }

    // Create temporary directory for processing
    const tempDir = path.join("/tmp", "image-matte");
    await fs.mkdir(tempDir, { recursive: true });

    const sessionId = uuidv4();
    const inputPath = path.join(tempDir, `input_${sessionId}.jpg`);
    const outputPath = path.join(tempDir, `output_${sessionId}.jpg`);

    try {
      // First, try the remote matte service if configured and requested
      const remoteServiceUrl = process.env.CANVAS_EXTENSION_SERVICE_URL; // Reuse the same service
      if (remoteServiceUrl && processingMethod === "cloud") {
        try {
          console.log("🌐 Trying remote matte service...");
          console.log("🔗 Remote service URL:", remoteServiceUrl);

          const remoteResponse = await fetch(
            `${remoteServiceUrl}/create-matte`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                imageUrl,
                canvasWidth,
                canvasHeight,
                paddingPercent,
                matteColor,
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
                  const reqWidth = requestedWidth || canvasWidth;
                  const reqHeight = requestedHeight || canvasHeight;
                  processedFilename = `${nameWithoutExt}-MATTE-${reqWidth}x${reqHeight}-${scaleMultiplier}X.jpg`;
                } else {
                  const reqWidth = requestedWidth || canvasWidth;
                  const reqHeight = requestedHeight || canvasHeight;
                  processedFilename = `${nameWithoutExt}-MATTE-${reqWidth}x${reqHeight}.jpg`;
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
                    processing: "image_matte",
                    originalImage: imageUrl,
                    parameters: {
                      canvasWidth,
                      canvasHeight,
                      paddingPercent,
                      matteColor,
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
                    "Image matte created successfully with Cloud Run service and uploaded to Cloudflare",
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
                    "Image matte created successfully with Cloud Run service",
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
              message:
                "Image matte created successfully with Cloud Run service",
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
            console.log("⚠️ Falling back to local binary...");
          }
        } catch (remoteError) {
          console.log(
            "⚠️ Remote service error, trying local binary:",
            remoteError
          );
        }
      } else {
        console.log(
          "🔧 Using local binary (cloud service not configured or local method selected)..."
        );
      }

      // Download the image
      console.log("🔍 Attempting to download image from:", imageUrl);
      let imageResponse = await fetch(imageUrl);
      console.log("🔍 Image download response:", {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        ok: imageResponse.ok,
      });

      // If the enhanced URL fails, try fallback options
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
      }

      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`
        );
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(imageBuffer));

      // Local binary processing
      console.log("🔧 Attempting local matte generator processing...");

      // Determine the correct binary path based on platform
      const platform = process.platform;
      const binaryName =
        platform === "darwin"
          ? "matte_generator_macos"
          : platform === "linux"
            ? "matte_generator_linux"
            : "matte_generator";

      let binaryPath = path.join(process.cwd(), binaryName);

      console.log("🔍 Platform detected:", platform);
      console.log("🔍 Binary name:", binaryName);
      console.log("🔍 Binary path:", binaryPath);

      try {
        await fs.access(binaryPath);
        console.log("✅ Binary found at:", binaryPath);
      } catch (accessError) {
        console.error("❌ Binary not found at:", binaryPath);
        console.error("Access error:", accessError);

        // Try alternative names in the current directory
        const altBinaries = [
          path.join(process.cwd(), "matte_generator"),
          path.join(process.cwd(), "matte_generator_macos"),
          path.join(process.cwd(), "matte_generator_linux"),
        ];

        let foundBinary = null;
        for (const altPath of altBinaries) {
          try {
            await fs.access(altPath);
            console.log("✅ Alternative binary found at:", altPath);
            foundBinary = altPath;
            break;
          } catch (e) {
            console.log("❌ Binary not found at:", altPath);
          }
        }

        if (!foundBinary) {
          throw new Error(
            `matte_generator binary not found. Expected: ${binaryPath}`
          );
        }

        // Update binaryPath to the found binary
        binaryPath = foundBinary;
        console.log("Using found binary:", binaryPath);
      }

      // Build command arguments with proper shell escaping
      const escapeShellArg = (arg: string) => {
        // Escape single quotes and wrap in single quotes
        return `'${arg.replace(/'/g, "'\"'\"'")}'`;
      };

      const args = [
        "--input",
        escapeShellArg(inputPath),
        "--output",
        escapeShellArg(outputPath),
        "--width",
        canvasWidth.toString(),
        "--height",
        canvasHeight.toString(),
        "--padding",
        paddingPercent.toString(),
        "--color",
        escapeShellArg(matteColor),
      ];

      // Execute the C++ program with proper shell escaping
      const command = `${escapeShellArg(binaryPath)} ${args.join(" ")}`;
      console.log("Executing command:", command);

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 30000, // 30 second timeout
        });

        if (stderr) {
          console.warn("Matte generator stderr:", stderr);
        }

        console.log("Matte generator stdout:", stdout);
      } catch (execError: any) {
        console.error("Matte generator execution error:", execError);

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
            "Matte generator binary is missing required OpenCV libraries. Please use the Cloud Run service instead, or ensure OpenCV is properly installed for local processing."
          );
        }

        throw new Error(
          `Matte generator execution failed: ${execError.message || execError}`
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
        message: "Image matte created successfully",
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
            const reqWidth = requestedWidth || canvasWidth;
            const reqHeight = requestedHeight || canvasHeight;
            processedFilename = `${nameWithoutExt}-MATTE-${reqWidth}x${reqHeight}-${scaleMultiplier}X.jpg`;
          } else {
            const reqWidth = requestedWidth || canvasWidth;
            const reqHeight = requestedHeight || canvasHeight;
            processedFilename = `${nameWithoutExt}-MATTE-${reqWidth}x${reqHeight}.jpg`;
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
              processing: "image_matte",
              originalImage: imageUrl,
              parameters: {
                canvasWidth,
                canvasHeight,
                paddingPercent,
                matteColor,
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
    console.error("Image matte error:", error);

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
