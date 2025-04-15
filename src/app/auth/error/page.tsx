"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const [errorCode, setErrorCode] = useState<string>("");
  const [detailedError, setDetailedError] = useState<string>("");

  useEffect(() => {
    const error = searchParams.get("error");
    const errorCode = error || "unknown";

    let detailedMessage = "";

    switch (errorCode) {
      case "Configuration":
        detailedMessage =
          "There's a problem with the server configuration. Please contact the administrator.";
        break;
      case "AccessDenied":
        detailedMessage = "You don't have permission to sign in.";
        break;
      case "Verification":
        detailedMessage = "The verification link is invalid or has expired.";
        break;
      case "OAuthSignin":
        detailedMessage = "Error in the OAuth sign-in process.";
        break;
      case "OAuthCallback":
        detailedMessage = "Error in the OAuth callback process.";
        break;
      case "OAuthCreateAccount":
        detailedMessage = "Error creating a user from the OAuth provider.";
        break;
      case "EmailCreateAccount":
        detailedMessage = "Error creating a user with the provided email.";
        break;
      case "Callback":
        detailedMessage = "Error in the auth callback process.";
        break;
      case "OAuthAccountNotLinked":
        detailedMessage =
          "Email already used with a different provider. Please sign in using the original provider.";
        break;
      case "EmailSignin":
        detailedMessage = "Error sending the email for sign in.";
        break;
      case "CredentialsSignin":
        detailedMessage =
          "Invalid credentials. Please check your email and password.";
        break;
      case "SessionRequired":
        detailedMessage = "You must be signed in to access this page.";
        break;
      case "InvalidToken":
        detailedMessage =
          "Your session is invalid or expired. Please sign in again.";
        break;
      case "ServerError":
        detailedMessage =
          "An unexpected server error occurred. Please try again later.";
        break;
      case "TokenError":
        detailedMessage =
          "There was a problem with your authentication token. Please sign in again.";
        break;
      case "AccountSuspended":
        detailedMessage =
          "Your account has been suspended. Please contact support for assistance.";
        break;
      case "InvalidSession":
        detailedMessage =
          "Your session is no longer valid. Please sign in again.";
        break;
      default:
        detailedMessage = "An unknown error occurred during authentication.";
    }

    setError(error || "Unknown error");
    setErrorCode(errorCode);
    setDetailedError(detailedMessage);
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Authentication Error
          </h1>
          <div className="mt-4 text-sm text-gray-600">
            <p className="text-red-600 font-semibold">{error}</p>
            <p className="mt-2">{detailedError}</p>

            {errorCode === "CredentialsSignin" && (
              <p className="mt-4 text-sm">
                If you've forgotten your password, you can{" "}
                <Link
                  href="/auth/forgot-password"
                  className="text-blue-600 hover:underline"
                >
                  reset it here
                </Link>
                .
              </p>
            )}

            {errorCode === "OAuthAccountNotLinked" && (
              <p className="mt-4 text-sm">
                Please sign in using the same method you used when creating your
                account.
              </p>
            )}

            {errorCode === "AccountSuspended" && (
              <p className="mt-4 text-sm">
                Please contact{" "}
                <Link href="/support" className="text-blue-600 hover:underline">
                  support
                </Link>{" "}
                for assistance with your account.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Button asChild className="w-full">
            <Link href="/auth/signin">Try Again</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Return to Home</Link>
          </Button>
          {errorCode === "Configuration" && (
            <Button asChild variant="outline" className="w-full">
              <Link href="/support">Contact Support</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
