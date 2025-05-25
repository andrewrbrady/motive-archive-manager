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
                const processedFilename = `${nameWithoutExt}_matte_${canvasWidth}x${canvasHeight}.jpg`;

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

                const cloudflareImageUrl = `${cloudflareResult.result.variants[0]}/public`;

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
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error("Failed to download image");
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(imageBuffer));

      // Check if matte_generator executable exists
      const platform = process.platform;
      const executableName =
        platform === "darwin" ? "matte_generator_macos" : "matte_generator";
      const executablePath = path.join(process.cwd(), executableName);

      try {
        await fs.access(executablePath);
      } catch {
        // Check if we're in a production environment
        const isProduction = process.env.NODE_ENV === "production";
        const errorMessage = isProduction
          ? "Image matte feature is currently unavailable in production. The C++ processing program could not be compiled during deployment."
          : `Matte generator program not found. Please ensure ${executableName} is compiled and available in the project root.`;

        return NextResponse.json(
          {
            error: errorMessage,
            details: isProduction
              ? "This feature requires OpenCV to be installed during the build process. Please check the deployment logs for compilation errors."
              : platform === "darwin"
                ? "Run: g++ -std=c++17 -O2 -Wall -o matte_generator_macos matte_generator.cpp `pkg-config --cflags --libs opencv4`"
                : "Run: g++ -std=c++17 -O2 -Wall -o matte_generator matte_generator.cpp `pkg-config --cflags --libs opencv4`",
          },
          { status: 503 } // Service Unavailable
        );
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
      const command = `${escapeShellArg(executablePath)} ${args.join(" ")}`;
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
          const processedFilename = `${nameWithoutExt}_matte_${canvasWidth}x${canvasHeight}.jpg`;

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

          const cloudflareImageUrl = `${cloudflareResult.result.variants[0]}/public`;

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
