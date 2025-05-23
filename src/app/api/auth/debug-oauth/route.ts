import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { auth } from "@/auth";
import { env } from "@/lib/env-setup";

/**
 * Enhanced debug endpoint for OAuth configuration and user management
 * This endpoint provides comprehensive debugging information for OAuth issues
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    // Allow access for debugging purposes (remove in production)
    const isDebugMode = process.env.NODE_ENV === "development";
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!isDebugMode && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const checkUser = url.searchParams.get("user");

    // OAuth Configuration Debug Info
    const oauthConfig = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        baseUrl: env.baseUrl,
        oauthCallbackUrl: env.oauthCallbackUrl,
      },
      google: {
        clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
        clientIdLength: process.env.GOOGLE_CLIENT_ID?.length,
        clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
        expectedCallbackUrl: `${env.baseUrl}/api/auth/callback/google`,
      },
      nextauth: {
        secretSet: !!(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET),
        basePath: "/api/auth",
        trustHost: true,
      },
    };

    let userDebugInfo = null;
    if (checkUser) {
      userDebugInfo = await debugUser(checkUser);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      oauthConfig,
      userDebugInfo,
      troubleshooting: {
        redirectUriIssue: {
          description: "If you're getting 'invalid_request redirect_uri' error",
          possibleCauses: [
            "NEXTAUTH_URL environment variable not set correctly",
            "Google OAuth Console redirect URI doesn't match callback URL",
            "Environment variable interpolation issue in deployment",
          ],
          solutions: [
            `Set NEXTAUTH_URL to: ${env.baseUrl}`,
            `Add this redirect URI to Google Console: ${env.oauthCallbackUrl}`,
            "Verify environment variables are properly set in deployment platform",
          ],
        },
        commonIssues: [
          {
            issue: "OAuth callback not working",
            check: "Verify Google OAuth Console settings",
            expectedRedirectUri: env.oauthCallbackUrl,
          },
          {
            issue: "User not found after OAuth",
            check: "Check Firebase Auth and Firestore user creation",
            solution: "Use POST endpoint to debug specific user",
          },
        ],
      },
    });
  } catch (error: any) {
    console.error("OAuth debug error:", error);
    return NextResponse.json(
      {
        error: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Only allow admin access for user operations
    const session = await auth();
    const isAdmin = session?.user?.roles?.includes("admin");

    // Temporary bypass: allow specific user to sync their own claims
    const isSelfSync = session?.user?.id === "G46fdpqaufe7bmhluKAhakVM44e2";

    if (!isAdmin && !isSelfSync) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();
    const { uid, email, name, photoURL, action } = data;

    if (!uid || !email) {
      return NextResponse.json(
        { error: "UID and email are required" },
        { status: 400 }
      );
    }

    // For self-sync, only allow syncing own account
    if (isSelfSync && uid !== session?.user?.id) {
      return NextResponse.json(
        { error: "Can only sync your own account" },
        { status: 403 }
      );
    }

    const result = await debugUser(uid, email);

    // Perform requested actions
    if (action === "createAuth" && !result.authUserExists) {
      result.authCreationResult = await createFirebaseAuthUser(
        uid,
        email,
        name,
        photoURL
      );
    }

    if (action === "createFirestore" && !result.firestoreUserExists) {
      result.firestoreCreationResult = await createFirestoreUser(
        uid,
        email,
        name,
        photoURL
      );
    }

    if (action === "syncUser") {
      // For syncUser, update Firebase Auth custom claims to match Firestore
      if (result.firestoreUserExists && result.firestoreUser) {
        try {
          const newClaims = {
            roles: result.firestoreUser.roles || ["user"],
            creativeRoles: result.firestoreUser.creativeRoles || [],
            status: result.firestoreUser.status || "active",
          };

          await adminAuth.setCustomUserClaims(uid, newClaims);
          result.claimsUpdateResult = {
            success: true,
            newClaims,
            message: "Firebase Auth custom claims updated to match Firestore",
          };
        } catch (error: any) {
          result.claimsUpdateResult = {
            success: false,
            error: error.message,
          };
        }
      }

      if (!result.authUserExists) {
        result.authCreationResult = await createFirebaseAuthUser(
          uid,
          email,
          name,
          photoURL
        );
      }
      if (!result.firestoreUserExists) {
        result.firestoreCreationResult = await createFirestoreUser(
          uid,
          email,
          name,
          photoURL
        );
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Debug OAuth POST error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

async function debugUser(uid: string, email?: string) {
  const result: any = {
    uid,
    email,
    authUserExists: false,
    firestoreUserExists: false,
    authUser: null,
    firestoreUser: null,
  };

  // Check Firebase Auth
  try {
    const authUser = await adminAuth.getUser(uid);
    result.authUserExists = true;
    result.authUser = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      emailVerified: authUser.emailVerified,
      disabled: authUser.disabled,
      customClaims: authUser.customClaims,
      creationTime: authUser.metadata.creationTime,
      lastSignInTime: authUser.metadata.lastSignInTime,
      providerData: authUser.providerData.map((p) => ({
        providerId: p.providerId,
        uid: p.uid,
        email: p.email,
      })),
    };
  } catch (error: any) {
    if (email) {
      // Try to find by email
      try {
        const authUser = await adminAuth.getUserByEmail(email);
        result.authUserExists = true;
        result.authUser = {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          emailVerified: authUser.emailVerified,
          disabled: authUser.disabled,
          customClaims: authUser.customClaims,
          creationTime: authUser.metadata.creationTime,
          lastSignInTime: authUser.metadata.lastSignInTime,
        };
        result.note = "Found user by email instead of UID";
      } catch (emailError) {
        result.authError = error.message;
      }
    } else {
      result.authError = error.message;
    }
  }

  // Check Firestore
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    result.firestoreUserExists = userDoc.exists;
    if (userDoc.exists) {
      result.firestoreUser = userDoc.data();
    }
  } catch (error: any) {
    result.firestoreError = error.message;
  }

  return result;
}

async function createFirebaseAuthUser(
  uid: string,
  email: string,
  name?: string,
  photoURL?: string
) {
  try {
    const newUser = await adminAuth.createUser({
      uid: uid,
      email: email,
      emailVerified: true,
      displayName: name || email.split("@")[0],
      photoURL: photoURL || "",
      disabled: false,
    });

    // Set custom claims
    await adminAuth.setCustomUserClaims(uid, {
      roles: ["user"],
      creativeRoles: [],
      status: "active",
    });

    return { success: true, user: newUser };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function createFirestoreUser(
  uid: string,
  email: string,
  name?: string,
  photoURL?: string
) {
  try {
    await adminDb
      .collection("users")
      .doc(uid)
      .set({
        uid: uid,
        name: name || email.split("@")[0],
        email: email,
        image: photoURL || "",
        roles: ["user"],
        creativeRoles: [],
        status: "active",
        accountType: "personal",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
