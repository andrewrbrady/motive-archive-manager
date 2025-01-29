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
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadata = formData.get("metadata") as string;
    const vehicleInfo = formData.get("vehicleInfo") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    if (metadata) {
      uploadFormData.append("metadata", metadata);
    }
    uploadFormData.append("requireSignedURLs", "false");

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
        body: uploadFormData,
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
        { error: `Failed to upload to Cloudflare: ${response.statusText}` },
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

    const imageUrl = result.result.variants[0].replace(/\/public$/, "");

    // Analyze the image with OpenAI
    const analysisResponse = await fetch(
      `${request.nextUrl.origin}/api/openai/analyze-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          vehicleInfo: vehicleInfo ? JSON.parse(vehicleInfo) : undefined,
        }),
      }
    );

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("OpenAI analysis error:", {
        status: analysisResponse.status,
        statusText: analysisResponse.statusText,
        body: errorText,
      });
      return NextResponse.json({
        success: true,
        imageId: result.result.id,
        imageUrl,
        metadata: {},
      });
    }

    const analysisResult = await analysisResponse.json();

    // Combine the original metadata with the AI analysis
    const combinedMetadata = {
      ...JSON.parse(metadata || "{}"),
      angle: analysisResult.analysis?.angle || "",
      view: analysisResult.analysis?.view || "",
      movement: analysisResult.analysis?.movement || "",
      tod: analysisResult.analysis?.tod || "",
      side: analysisResult.analysis?.side || "",
      description: analysisResult.analysis?.description || "",
      aiAnalysis: analysisResult.analysis,
    };

    // Update the image metadata in Cloudflare
    const metadataResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1/${result.result.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata: combinedMetadata }),
      }
    );

    if (!metadataResponse.ok) {
      console.error(
        "Failed to update Cloudflare metadata:",
        await metadataResponse.text()
      );
    }

    // Return both the image ID, URL, and the analysis
    return NextResponse.json({
      success: true,
      imageId: result.result.id,
      imageUrl,
      metadata: combinedMetadata,
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

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors[0].message },
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
