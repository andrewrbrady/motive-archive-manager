import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// POST /api/dropbox/folder/import - Import images from Dropbox folder to Cloudflare
export async function POST(request: NextRequest) {
  console.log("POST /api/dropbox/folder/import - Import endpoint called");

  try {
    const { folderUrl, selectedImages, inspectionId } = await request.json();

    if (!folderUrl) {
      return NextResponse.json(
        { error: "Dropbox folder URL is required" },
        { status: 400 }
      );
    }

    if (
      !selectedImages ||
      !Array.isArray(selectedImages) ||
      selectedImages.length === 0
    ) {
      return NextResponse.json(
        { error: "Selected images array is required" },
        { status: 400 }
      );
    }

    const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Dropbox access token not configured" },
        { status: 500 }
      );
    }

    console.log(
      `Importing ${selectedImages.length} images from Dropbox to Cloudflare and saving to main collection`
    );

    // Get database connection for saving to main images collection
    const db = await getDatabase();
    const imagesCollection = db.collection("images");

    const uploadedImages = [];
    const errors = [];
    const now = new Date().toISOString();

    for (const imagePath of selectedImages) {
      try {
        console.log(`Processing image: ${imagePath}`);

        // Download image using the Dropbox API instead of direct URLs
        const imageData = await downloadFileFromDropbox(
          imagePath,
          folderUrl,
          accessToken
        );

        if (!imageData) {
          errors.push({
            path: imagePath,
            error: "Failed to download from Dropbox",
          });
          continue;
        }

        // Upload to Cloudflare Images
        console.log(`Attempting Cloudflare upload for: ${imagePath}`);
        console.log(`Image data size: ${imageData.byteLength} bytes`);

        const cloudflareResult = await uploadToCloudflare(imageData, imagePath);

        console.log(
          `Cloudflare upload result for ${imagePath}:`,
          cloudflareResult
        );

        if (cloudflareResult.success) {
          console.log(`✅ Cloudflare upload successful for ${imagePath}`);

          const uploadedImage: {
            originalPath: string;
            cloudflareId: string;
            filename: string;
            url: string;
            mongoId?: string;
          } = {
            originalPath: imagePath,
            cloudflareId: cloudflareResult.result.id,
            filename: extractFilename(imagePath),
            url: cloudflareResult.result.variants[0],
          };

          // Save to main images collection if enabled (option B)
          try {
            const imageDoc = {
              _id: new ObjectId(),
              cloudflareId: cloudflareResult.result.id,
              url: cloudflareResult.result.variants[0],
              filename: extractFilename(imagePath),
              metadata: {
                source: "dropbox_import",
                originalPath: imagePath,
                dropboxFolderUrl: folderUrl,
                importedAt: now,
                ...(inspectionId && { inspectionId }),
              },
              createdAt: now,
              updatedAt: now,
            };

            const insertResult = await imagesCollection.insertOne(imageDoc);

            if (insertResult.acknowledged) {
              console.log(
                `✅ Saved image to main collection with ID: ${insertResult.insertedId}`
              );
              uploadedImage.mongoId = insertResult.insertedId.toString();
            } else {
              console.warn(
                `⚠️ Failed to save image to main collection: ${imagePath}`
              );
            }
          } catch (mongoError) {
            console.error(
              `❌ Error saving to main collection for ${imagePath}:`,
              mongoError
            );
            // Don't fail the entire import if MongoDB save fails
          }

          uploadedImages.push(uploadedImage);
        } else {
          console.log(
            `❌ Cloudflare upload failed for ${imagePath}:`,
            cloudflareResult.errors
          );
          errors.push({
            path: imagePath,
            error: "Failed to upload to Cloudflare",
            details: cloudflareResult.errors,
          });
        }
      } catch (error) {
        console.error(`Error processing image ${imagePath}:`, error);
        errors.push({
          path: imagePath,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const response = {
      success: true,
      uploaded: uploadedImages,
      errors: errors,
      summary: {
        total: selectedImages.length,
        successful: uploadedImages.length,
        failed: errors.length,
        savedToMainCollection: uploadedImages.filter((img) => img.mongoId)
          .length,
      },
    };

    console.log(
      `Import completed: ${uploadedImages.length} uploaded, ${errors.length} errors, ${response.summary.savedToMainCollection} saved to main collection`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error importing Dropbox images:", error);
    return NextResponse.json(
      {
        error: "Failed to import images",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function createDirectDownloadLink(
  folderUrl: string,
  filePath: string
): Promise<string | null> {
  try {
    // Convert Dropbox shared folder URL to direct download URL
    // From: https://www.dropbox.com/sh/abc123/xyz?dl=0
    // To: https://www.dropbox.com/sh/abc123/xyz/filename?dl=1

    const filename = extractFilename(filePath);
    const baseUrl = folderUrl.replace("?dl=0", "").replace("&dl=0", "");
    const downloadUrl = `${baseUrl}/${encodeURIComponent(filename)}?dl=1`;

    console.log("Created direct download URL:", downloadUrl);
    return downloadUrl;
  } catch (error) {
    console.error("Error creating direct download link:", error);
    return null;
  }
}

async function downloadFileFromDropbox(
  filePath: string,
  sharedFolderUrl: string,
  accessToken: string
): Promise<Buffer | null> {
  try {
    console.log(`[Dropbox API] Downloading file: ${filePath}`);
    console.log(`[Dropbox API] From shared folder: ${sharedFolderUrl}`);

    // Use the sharing/get_shared_link_file endpoint for shared folder files
    const response = await fetch(
      "https://content.dropboxapi.com/2/sharing/get_shared_link_file",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Dropbox-API-Arg": JSON.stringify({
            url: sharedFolderUrl,
            path: `/${filePath}`, // Add leading slash for path within shared folder
          }),
        },
      }
    );

    console.log(`[Dropbox API] Download response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Dropbox API] Download failed:`, errorText);
      return null;
    }

    const contentType = response.headers.get("content-type");
    console.log(`[Dropbox API] Downloaded content-type: ${contentType}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(
      `[Dropbox API] Downloaded file size: ${buffer.byteLength} bytes`
    );

    // Verify this is actually an image
    const firstBytes = buffer.slice(0, 4);
    const isJPEG = firstBytes[0] === 0xff && firstBytes[1] === 0xd8;
    const isPNG =
      firstBytes[0] === 0x89 &&
      firstBytes[1] === 0x50 &&
      firstBytes[2] === 0x4e &&
      firstBytes[3] === 0x47;

    console.log(`[Dropbox API] File type: JPEG=${isJPEG}, PNG=${isPNG}`);

    if (!isJPEG && !isPNG) {
      console.error(`[Dropbox API] Downloaded content is not a valid image`);
      return null;
    }

    console.log(
      `[Dropbox API] ✅ Successfully downloaded valid image: ${filePath}`
    );
    return buffer;
  } catch (error) {
    console.error(`[Dropbox API] Error downloading file:`, error);
    return null;
  }
}

async function uploadToCloudflare(
  imageData: Buffer,
  filename: string
): Promise<any> {
  try {
    console.log(`[Cloudflare] Starting upload for: ${filename}`);
    console.log(`[Cloudflare] Image data size: ${imageData.byteLength} bytes`);

    // Check environment variables
    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN;

    console.log(
      `[Cloudflare] Account ID configured: ${accountId ? "Yes" : "No"}`
    );
    console.log(
      `[Cloudflare] API Token configured: ${apiToken ? "Yes" : "No"}`
    );

    if (!accountId || !apiToken) {
      console.error("[Cloudflare] Missing environment variables");
      return { success: false, errors: ["Missing Cloudflare credentials"] };
    }

    const formData = new FormData();
    const blob = new Blob([imageData], { type: "image/jpeg" });
    formData.append("file", blob, extractFilename(filename));

    console.log(
      `[Cloudflare] FormData created for: ${extractFilename(filename)}`
    );

    const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`;
    console.log(`[Cloudflare] Upload URL: ${uploadUrl}`);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formData,
    });

    console.log(`[Cloudflare] Response status: ${response.status}`);
    console.log(
      `[Cloudflare] Response headers:`,
      Object.fromEntries(response.headers.entries())
    );

    const result = await response.json();
    console.log(`[Cloudflare] Response body:`, result);

    return result;
  } catch (error) {
    console.error("[Cloudflare] Error uploading to Cloudflare:", error);
    return { success: false, errors: [error] };
  }
}

function extractFilename(path: string): string {
  return path.split("/").pop() || path;
}
