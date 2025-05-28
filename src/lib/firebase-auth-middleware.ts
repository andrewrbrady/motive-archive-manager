import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { DecodedIdToken } from "firebase-admin/auth";

// Type for API token data
interface ApiTokenData {
  userId: string;
  userEmail: string;
  tokenType: "api_token";
}

// Type for Firebase token data
interface FirebaseTokenData extends DecodedIdToken {
  tokenType: "firebase_auth";
  roles?: string[];
}

// Combined token data type
type TokenData = ApiTokenData | FirebaseTokenData;

// Response type for auth error responses
type AuthErrorResponse = {
  error: string;
  details?: string;
  code?: string;
};

/**
 * Enhanced Firebase token verification with better error handling and logging
 * @param token The token to verify
 * @returns The decoded token data or null if invalid
 */
export async function verifyFirebaseToken(
  token: string
): Promise<TokenData | null> {
  if (!token || token.trim() === "") {
    console.log("🔒 verifyFirebaseToken: Empty or missing token");
    return null;
  }

  try {
    console.log(
      "🔒 verifyFirebaseToken: Attempting Firebase Auth verification..."
    );

    // First, try to verify as Firebase Auth token (most common case)
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      console.log(
        "✅ verifyFirebaseToken: Firebase Auth token verified successfully",
        {
          uid: decodedToken.uid,
          email: decodedToken.email,
        }
      );

      return {
        ...decodedToken,
        tokenType: "firebase_auth",
      };
    } catch (firebaseError: any) {
      console.log(
        "⚠️ verifyFirebaseToken: Firebase Auth verification failed:",
        {
          error: firebaseError.message,
          code: firebaseError.code,
          tokenLength: token.length,
        }
      );

      // If Firebase Auth verification fails, check if it's an API token
      // Only check API tokens if the token is reasonably short (not a JWT)
      if (token.length < 500) {
        console.log(
          "🔒 verifyFirebaseToken: Attempting API token verification..."
        );

        const tokensSnapshot = await adminDb
          .collection("api_tokens")
          .where("token", "==", token)
          .where("expiresAt", ">", new Date())
          .limit(1)
          .get();

        if (!tokensSnapshot.empty) {
          const tokenDoc = tokensSnapshot.docs[0];
          console.log(
            "✅ verifyFirebaseToken: API token verified successfully",
            {
              userId: tokenDoc.data().userId,
              userEmail: tokenDoc.data().userEmail,
            }
          );

          // Update last used
          await tokenDoc.ref.update({ lastUsed: new Date() });

          return {
            userId: tokenDoc.data().userId,
            userEmail: tokenDoc.data().userEmail,
            tokenType: "api_token",
          };
        } else {
          console.log("❌ verifyFirebaseToken: API token not found or expired");
        }
      }

      // If both Firebase Auth and API token verification fail, throw the original error
      throw firebaseError;
    }
  } catch (error: any) {
    console.error("💥 verifyFirebaseToken: Error verifying token:", {
      error: error.message,
      code: error.code,
      tokenLength: token?.length || 0,
    });
    return null;
  }
}

/**
 * Enhanced middleware to verify Firebase token in Authorization header
 * @param request The incoming request
 * @param requiredRoles Optional array of roles required to access the route
 * @returns NextResponse or null if token is valid
 */
export async function verifyAuthMiddleware(
  request: NextRequest,
  requiredRoles: string[] = []
): Promise<NextResponse<AuthErrorResponse> | null> {
  console.log("🔒 verifyAuthMiddleware: Starting authentication check", {
    url: request.url,
    method: request.method,
    requiredRoles,
  });

  // Get the Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(
      "❌ verifyAuthMiddleware: Missing or invalid authorization header"
    );
    return NextResponse.json(
      {
        error: "Authentication required",
        details: "Missing or invalid authorization token",
        code: "MISSING_AUTH_HEADER",
      },
      { status: 401 }
    );
  }

  // Extract and verify the token
  const token = authHeader.split("Bearer ")[1];
  console.log("🔒 verifyAuthMiddleware: Extracted token", {
    tokenLength: token?.length || 0,
  });

  const tokenData = await verifyFirebaseToken(token);

  if (!tokenData) {
    console.log("❌ verifyAuthMiddleware: Token verification failed");
    return NextResponse.json(
      {
        error: "Authentication failed",
        details: "Invalid or expired token",
        code: "INVALID_TOKEN",
      },
      { status: 401 }
    );
  }

  console.log("✅ verifyAuthMiddleware: Token verified successfully", {
    tokenType: tokenData.tokenType,
    userId:
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid,
  });

  // Check roles if specified
  if (requiredRoles.length > 0) {
    console.log("🔒 verifyAuthMiddleware: Checking roles", { requiredRoles });

    // For API tokens, fetch user data from Firestore to check roles
    if (tokenData.tokenType === "api_token") {
      try {
        const userDoc = await adminDb
          .collection("users")
          .doc(tokenData.userId)
          .get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const roles = userData?.roles || [];
          console.log("🔒 verifyAuthMiddleware: User roles from Firestore", {
            roles,
          });

          if (!requiredRoles.some((role) => roles.includes(role))) {
            console.log(
              "❌ verifyAuthMiddleware: Insufficient permissions (API token)"
            );
            return NextResponse.json(
              {
                error: "Access denied",
                details: "Insufficient permissions",
                code: "INSUFFICIENT_PERMISSIONS",
              },
              { status: 403 }
            );
          }
        } else {
          console.log("❌ verifyAuthMiddleware: User not found in Firestore");
          return NextResponse.json(
            {
              error: "User not found",
              details: "User data not found in database",
              code: "USER_NOT_FOUND",
            },
            { status: 404 }
          );
        }
      } catch (error: any) {
        console.error(
          "💥 verifyAuthMiddleware: Error fetching user data:",
          error
        );
        return NextResponse.json(
          {
            error: "Internal server error",
            details: "Failed to verify user permissions",
            code: "INTERNAL_ERROR",
          },
          { status: 500 }
        );
      }
    }
    // For Firebase Auth tokens, check roles from token claims
    else {
      const userRoles = tokenData.roles || [];
      console.log("🔒 verifyAuthMiddleware: User roles from token", {
        userRoles,
      });

      if (!requiredRoles.some((role) => userRoles.includes(role))) {
        console.log(
          "❌ verifyAuthMiddleware: Insufficient permissions (Firebase token)"
        );
        return NextResponse.json(
          {
            error: "Access denied",
            details: "Insufficient permissions",
            code: "INSUFFICIENT_PERMISSIONS",
          },
          { status: 403 }
        );
      }
    }
  }

  console.log(
    "✅ verifyAuthMiddleware: Authentication and authorization successful"
  );
  return null;
}

/**
 * Enhanced wrapper function to protect API routes with Firebase authentication
 * @param handler The route handler function
 * @param requiredRoles Optional array of roles required to access the route
 */
export function withFirebaseAuth<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>,
  requiredRoles: string[] = []
) {
  return async function (
    request: NextRequest,
    context?: any
  ): Promise<NextResponse<T | AuthErrorResponse>> {
    console.log("🔒 withFirebaseAuth: Protecting route", {
      url: request.url,
      method: request.method,
      requiredRoles,
    });

    const authResult = await verifyAuthMiddleware(request, requiredRoles);
    if (authResult) {
      console.log(
        "❌ withFirebaseAuth: Authentication failed, returning error response"
      );
      return authResult as NextResponse<AuthErrorResponse>;
    }

    console.log(
      "✅ withFirebaseAuth: Authentication successful, calling handler"
    );
    // Authentication succeeded, call the handler with the context if provided
    try {
      return await handler(request, context);
    } catch (error: any) {
      console.error("💥 withFirebaseAuth: Handler error:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          details: error.message,
          code: "HANDLER_ERROR",
        },
        { status: 500 }
      ) as NextResponse<AuthErrorResponse>;
    }
  };
}

/**
 * Utility function to extract user ID from token data
 */
export function getUserIdFromToken(tokenData: TokenData): string {
  return tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;
}

/**
 * Utility function to extract user email from token data
 */
export function getUserEmailFromToken(tokenData: TokenData): string {
  return tokenData.tokenType === "api_token"
    ? tokenData.userEmail
    : tokenData.email || "";
}
