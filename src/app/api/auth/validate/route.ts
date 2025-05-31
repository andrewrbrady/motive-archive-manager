import { NextRequest, NextResponse } from "next/server";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

async function validateToken(request: NextRequest) {
  console.log("🔒 GET /api/auth/validate - Token validation endpoint starting");
  console.log("🔒 Request URL:", request.url);
  console.log("🔒 Request method:", request.method);

  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    console.log("🔒 Auth header received:", authHeader ? "Yes" : "No");

    const token = authHeader.split("Bearer ")[1];

    if (!token) {
      console.log("❌ validateToken: No token provided");
      return NextResponse.json(
        {
          valid: false,
          error: "No token provided",
          code: "MISSING_TOKEN",
        },
        { status: 401 }
      );
    }

    console.log("🔒 Token received, length:", token.length);

    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      console.log("❌ validateToken: Token verification failed");
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid token",
          code: "INVALID_TOKEN",
        },
        { status: 401 }
      );
    }

    console.log("✅ validateToken: Token is valid", {
      tokenType: tokenData.tokenType,
      userId:
        tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid,
    });

    return NextResponse.json({
      valid: true,
      tokenType: tokenData.tokenType,
      userId:
        tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid,
      email:
        tokenData.tokenType === "api_token"
          ? tokenData.userEmail
          : tokenData.email,
    });
  } catch (error: any) {
    console.error("💥 validateToken: Error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Token validation failed",
        details: error.message,
        code: "VALIDATION_ERROR",
      },
      { status: 500 }
    );
  }
}

export const GET = validateToken;
