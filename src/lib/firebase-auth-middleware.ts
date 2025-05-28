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
};

/**
 * Verify Firebase token from Authorization header
 * This is used for API routes that need to be accessed programmatically
 * @param token The token to verify
 * @returns The decoded token data or null if invalid
 */
export async function verifyFirebaseToken(
  token: string
): Promise<TokenData | null> {
  try {
    // First, try to verify as Firebase Auth token (most common case)
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      return {
        ...decodedToken,
        tokenType: "firebase_auth",
      };
    } catch (firebaseError) {
      // If Firebase Auth verification fails, check if it's an API token
      // Only check API tokens if the token is reasonably short (not a JWT)
      if (token.length < 500) {
        const tokensSnapshot = await adminDb
          .collection("api_tokens")
          .where("token", "==", token)
          .where("expiresAt", ">", new Date())
          .limit(1)
          .get();

        if (!tokensSnapshot.empty) {
          const tokenDoc = tokensSnapshot.docs[0];
          // Update last used
          await tokenDoc.ref.update({ lastUsed: new Date() });

          return {
            userId: tokenDoc.data().userId,
            userEmail: tokenDoc.data().userEmail,
            tokenType: "api_token",
          };
        }
      }

      // If both Firebase Auth and API token verification fail, throw the original error
      throw firebaseError;
    }
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    return null;
  }
}

/**
 * Middleware to verify Firebase token in Authorization header
 * @param request The incoming request
 * @param requiredRoles Optional array of roles required to access the route
 * @returns NextResponse or null if token is valid
 */
export async function verifyAuthMiddleware(
  request: NextRequest,
  requiredRoles: string[] = []
): Promise<NextResponse<AuthErrorResponse> | null> {
  // Get the Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization token" },
      { status: 401 }
    );
  }

  // Extract and verify the token
  const token = authHeader.split("Bearer ")[1];
  const tokenData = await verifyFirebaseToken(token);

  if (!tokenData) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  // Check roles if specified
  if (requiredRoles.length > 0) {
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

          if (!requiredRoles.some((role) => roles.includes(role))) {
            return NextResponse.json(
              { error: "Insufficient permissions" },
              { status: 403 }
            );
          }
        } else {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    }
    // For Firebase Auth tokens, check roles from token claims
    else {
      const userRoles = tokenData.roles || [];
      if (!requiredRoles.some((role) => userRoles.includes(role))) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }
  }

  // Token is valid and roles match - attach user data to request
  return null;
}

/**
 * Wrapper function to protect API routes with Firebase authentication
 * @param handler The route handler function
 * @param requiredRoles Optional array of roles required to access the route
 */
export function withFirebaseAuth<T extends object | string = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>,
  requiredRoles: string[] = []
) {
  return async function (
    request: NextRequest,
    context?: any
  ): Promise<NextResponse<T | AuthErrorResponse>> {
    const authResult = await verifyAuthMiddleware(request, requiredRoles);
    if (authResult) {
      return authResult as NextResponse<AuthErrorResponse>;
    }

    // Authentication succeeded, call the handler with the context if provided
    return handler(request, context);
  };
}
