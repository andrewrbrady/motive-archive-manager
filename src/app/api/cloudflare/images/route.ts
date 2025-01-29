import { NextRequest, NextResponse } from "next/server";

// Set maximum execution time to 60 seconds
export const maxDuration = 60;
export const runtime = "nodejs";

interface CloudflareImage {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
}

interface CloudflareResponse {
  result: {
    images: CloudflareImage[];
  };
  success: boolean;
  errors: Array<{
    code: number;
    message: string;
  }>;
}

export async function GET() {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    const result = (await response.json()) as CloudflareResponse;

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 400 }
      );
    }

    // Transform the response to return only the image URLs without the /public suffix
    const images = result.result.images.map((image) =>
      image.variants[0].replace(/\/public$/, "")
    );

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error fetching images from Cloudflare:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("POST request received");
    const formData = await request.formData();
    console.log("FormData received:", Array.from(formData.entries()));

    const file = formData.get("file") as File;
    const metadataStr = formData.get("metadata") as string;
    console.log("File from formData:", file ? "File present" : "No file");
    console.log("Metadata from formData:", metadataStr);

    if (!file) {
      console.log("No file in request");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Create a new FormData for the Cloudflare request
    const cloudflareFormData = new FormData();
    cloudflareFormData.append("file", file);

    // Add metadata if present
    if (metadataStr) {
      try {
        const metadata = JSON.parse(metadataStr);
        cloudflareFormData.append("metadata", JSON.stringify(metadata));
      } catch (error) {
        console.error("Error parsing metadata:", error);
      }
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
        body: cloudflareFormData,
      }
    );

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 400 }
      );
    }

    // Transform the response to include the image URL and metadata
    const imageUrl = result.result.variants[0].replace(/\/public$/, "");
    const metadata = {
      ...(result.result.meta || {}),
      // Add empty placeholders for OpenAI analysis fields
      angle: "",
      view: "",
      movement: "",
      tod: "",
      side: "",
      description: "",
    };

    return NextResponse.json({
      imageUrl,
      metadata,
      success: true,
    });
  } catch (error) {
    console.error("Error uploading to Cloudflare Images:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { imageId } = await request.json();

    if (!imageId) {
      return NextResponse.json(
        { error: "No image ID provided" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare API error response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
      });
      return NextResponse.json(
        { error: `Failed to delete from Cloudflare: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (!result.success) {
      console.error("Cloudflare API error:", result.errors);
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Unknown Cloudflare error" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting from Cloudflare Images:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
