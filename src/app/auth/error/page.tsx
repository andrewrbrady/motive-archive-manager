"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const [errorType, setErrorType] = useState<string>("unknown");
  const [errorMessage, setErrorMessage] = useState<string>(
    "An unknown error occurred during authentication."
  );

  useEffect(() => {
    const error = searchParams.get("error");

    if (error) {
      setErrorType(error);

      // Set appropriate error message based on error type
      switch (error) {
        case "AccessDenied":
          setErrorMessage(
            "Access denied. You do not have permission to access this resource."
          );
          break;
        case "Verification":
          setErrorMessage(
            "The verification link you used is invalid or has expired."
          );
          break;
        case "OAuthSignin":
          setErrorMessage("Error occurred during OAuth sign-in.");
          break;
        case "OAuthCallback":
          setErrorMessage("Error occurred during OAuth callback.");
          break;
        case "OAuthCreateAccount":
          setErrorMessage("Error creating OAuth account.");
          break;
        case "EmailCreateAccount":
          setErrorMessage("Error creating email account.");
          break;
        case "Callback":
          setErrorMessage("Error during callback processing.");
          break;
        case "OAuthAccountNotLinked":
          setErrorMessage("Email already in use with different provider.");
          break;
        case "EmailSignin":
          setErrorMessage("Error sending email verification.");
          break;
        case "CredentialsSignin":
          setErrorMessage("Invalid email or password.");
          break;
        case "SessionRequired":
          setErrorMessage("You must be signed in to access this page.");
          break;
        default:
          setErrorMessage(`Authentication error: ${error}`);
      }
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-center">{errorType}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 text-center">
          <div className="bg-muted p-4 rounded-md w-full">
            <p>{errorMessage}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center space-x-2">
          <Button asChild>
            <Link href="/auth/signin">Try Again</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
