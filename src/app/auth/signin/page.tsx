"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileOAuthButton } from "@/components/auth/MobileOAuthButton";

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = (() => {
    const url = searchParams?.get("callbackUrl") || "/dashboard";
    // Ensure callback URL is internal and safe
    if (url.startsWith("/") && !url.startsWith("//")) {
      return url;
    }
    return "/dashboard";
  })();

  const [error, setError] = useState("");

  useEffect(() => {
    // Check if redirected with error
    const errorParam = searchParams?.get("error");
    if (errorParam) {
      if (errorParam === "OAuthSignin") {
        setError("Error connecting to Google. Please try again.");
      } else if (errorParam === "OAuthCallback") {
        setError("Error during Google authentication. Please try again.");
      } else if (errorParam === "OAuthCreateAccount") {
        setError("Unable to create account. Please contact an administrator.");
      } else if (errorParam === "EmailCreateAccount") {
        setError(
          "Unable to create account with this email. Please contact an administrator."
        );
      } else if (errorParam === "Callback") {
        setError("Authentication callback error. Please try again.");
      } else if (errorParam === "OAuthAccountNotLinked") {
        setError(
          "To confirm your identity, sign in with the same account you used originally."
        );
      } else if (errorParam === "EmailSignin") {
        setError("The e-mail could not be sent.");
      } else if (errorParam === "CredentialsSignin") {
        setError("Sign in failed. Check the details you provided are correct.");
      } else if (errorParam === "SessionRequired") {
        setError("Please sign in to access this page.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Welcome</h1>
          <p className="text-muted-foreground mt-2">
            Sign in with your company Google account
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md text-center text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <MobileOAuthButton callbackUrl={callbackUrl} />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need access? Contact your administrator to get invited to the
            system.
          </p>
        </div>
      </div>
    </div>
  );
}
