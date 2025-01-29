import { NextRequest, NextResponse } from "next/server";

const CLOUDFLARE_ACCOUNT_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN;

type Props = {
  params: Promise<{ id: string }>;
};

interface CloudflareResponse {
  result: {
    id: string;
    filename: string;
    meta: {
      angle?: string;
      view?: string;
      tod?: string;
      movement?: string;
      description?: string;
      [key: string]: string | undefined;
    };
    uploaded: string;
    variants: string[];
  };
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  messages?: Array<{ code: number; message: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${id}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare API error response:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch from Cloudflare API" },
        { status: response.status }
      );
    }

    const data: CloudflareResponse = await response.json();

    if (!data.success) {
      console.error("Cloudflare API error:", data.errors);
      return NextResponse.json(
        { error: data.errors?.[0]?.message || "Unknown Cloudflare API error" },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Cloudflare metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata: body.metadata }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare API error response:", errorText);
      return NextResponse.json(
        { error: "Failed to update in Cloudflare API" },
        { status: response.status }
      );
    }

    const data: CloudflareResponse = await response.json();

    if (!data.success) {
      console.error("Cloudflare API error:", data.errors);
      return NextResponse.json(
        { error: data.errors?.[0]?.message || "Unknown Cloudflare API error" },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating Cloudflare metadata:", error);
    return NextResponse.json(
      { error: "Failed to update metadata" },
      { status: 500 }
    );
  }
}
