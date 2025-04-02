import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    console.log("Custom credentials signin handler called");

    // Parse the request body
    const body = await req.json();
    console.log("Credentials request body:", JSON.stringify(body, null, 2));

    // Get the redirect URL from the request or use a default
    const callbackUrl = body.callbackUrl || "/admin";

    // Return a mock success response
    return NextResponse.json({
      url: callbackUrl,
      ok: true,
    });
  } catch (error) {
    console.error("Error in custom credentials handler:", error);

    // Return an error response
    return NextResponse.json(
      {
        error: "CredentialsSignin",
        ok: false,
      },
      { status: 401 }
    );
  }
}
