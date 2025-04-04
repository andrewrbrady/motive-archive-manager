"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useFirebase } from "@/contexts/FirebaseContext";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signIn as nextAuthSignIn } from "next-auth/react";

export default function SignUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/admin";

  const { signUp } = useFirebase();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Starting user registration with Firebase...");
      console.log("Email:", email);

      // Create user with Firebase Authentication
      const user = await signUp(email, password);
      console.log("User created in Firebase Auth:", user.uid);
      console.log(
        "Full user object:",
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          displayName: user.displayName,
          photoURL: user.photoURL,
          metadata: user.metadata,
        })
      );

      // CRITICAL VERIFICATION: Check if user actually exists in Firebase Auth
      try {
        const authCheck = await fetch(`/api/auth/verify-user?uid=${user.uid}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const result = await authCheck.json();
        console.log("User verification check:", result);
      } catch (verifyError) {
        console.error("Error verifying user:", verifyError);
      }

      // Update user profile with name
      await updateProfile(user, {
        displayName: name,
      });
      console.log("User profile updated with display name");

      // Create a user document in Firestore
      console.log("Creating Firestore document for user:", user.uid);
      try {
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          roles: ["user"],
          creativeRoles: [],
          status: "active",
          accountType: "personal",
          profileImage: user.photoURL || "",
          createdAt: new Date(),
        });
        console.log("Firestore document created successfully");
      } catch (firestoreError: any) {
        console.error("Firestore document creation error:", firestoreError);
        console.error("Firestore error code:", firestoreError.code);
        console.error("Firestore error message:", firestoreError.message);
        // Continue with registration even if Firestore fails
      }

      // Add custom claims via the Admin SDK
      try {
        // Make a request to your API to set custom claims (this requires server-side Admin SDK)
        console.log("Setting custom claims for user:", user.uid);
        const response = await fetch(`/api/users/${user.uid}/roles`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roles: ["user"],
            creativeRoles: [],
            status: "active",
          }),
        });

        if (!response.ok) {
          console.error(
            "Failed to set custom claims for new user",
            await response.text()
          );
        } else {
          console.log("Custom claims set successfully");
        }
      } catch (error) {
        console.error("Error setting custom claims:", error);
        // Continue with registration even if setting custom claims fails
      }

      // Redirect to sign in page after successful registration
      router.push("/auth/signin?registered=true");
    } catch (err: any) {
      console.error("Registration error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      console.error(
        "Full error object:",
        JSON.stringify(err, Object.getOwnPropertyNames(err))
      );

      const errorCode = err.code;
      let errorMessage = "An unexpected error occurred. Please try again.";

      // Handle Firebase Auth error codes
      if (errorCode === "auth/email-already-in-use") {
        errorMessage = "This email is already in use.";
      } else if (errorCode === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (errorCode === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setIsLoading(true);

    try {
      // Use NextAuth's signIn method with Google provider
      const result = await nextAuthSignIn("google", {
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // If no redirect happened, manually redirect
      if (result?.url) {
        window.location.href = result.url;
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error: any) {
      console.error("Google sign-up error:", error);
      setError("Failed to sign up with Google. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-muted-foreground mt-2">
            Sign up to access the archive
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground"
            >
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Create a password"
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters long
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-foreground"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-muted"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-input rounded-md shadow-sm text-sm font-medium bg-white text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
