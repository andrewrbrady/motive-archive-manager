"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth, useSession } from "@/hooks/useFirebaseAuth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { logos } from "@/data/site-content";
import Image from "next/image";

export default function SigninForm() {
  const { signInWithGoogle, user } = useFirebaseAuth();
  const { status, data } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only redirect if we have authenticated status (which now means we have a Firebase user)
  useEffect(() => {
    console.log("SigninForm state:", {
      status,
      hasUser: !!user,
      hasData: !!data?.user,
    });

    // If user is authenticated (has Firebase user), redirect to dashboard
    if (status === "authenticated" && user) {
      console.log("SigninForm: Redirecting authenticated user to dashboard");
      router.push("/dashboard");
    }
  }, [status, user, router]); // Removed data dependency to prevent unnecessary re-renders

  // Show loading while checking authentication status
  if (status === "loading") {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-transparent border border-gray-700/30 rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Checking authentication...</span>
          </div>
        </div>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      // Redirect to dashboard after successful sign-in
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setError(error.message || "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Login Modal */}
      <div className="bg-transparent border border-gray-700/30 rounded-xl shadow-lg p-8">
        <div className="space-y-6">
          {/* Logo and Header inside the box */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Image
                src={logos.primary}
                alt="Motive Archive"
                width={64}
                height={64}
                className="w-16 h-16"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">
              Welcome to Motive Archive
            </h1>
            <p className="text-gray-400 text-sm mb-6">
              Sign in to access your archive manager
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-xs text-gray-500">
          By signing in, you agree to our terms of service and privacy policy
        </p>
      </div>
    </div>
  );
}
