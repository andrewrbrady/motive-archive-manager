"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface MobileOAuthButtonProps {
  callbackUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

// Helper function to detect mobile browsers
const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768
  );
};

// Helper function to detect iOS Safari specifically
const isIOSSafari = (): boolean => {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS/.test(ua);

  return iOS && webkit && notChrome;
};

export function MobileOAuthButton({
  callbackUrl = "/dashboard",
  className = "",
  children,
}: MobileOAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsIOS(isIOSSafari());
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    try {
      // Use direct redirect for both mobile and desktop
      // This approach is working perfectly on mobile, so let's use it everywhere
      await signIn("google", {
        callbackUrl,
        redirect: true, // Use direct redirect for all devices
      });
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setIsLoading(false);
    }
  };

  // Add mobile-specific attributes for better touch interaction
  const buttonProps = isMobile
    ? {
        // Prevent zoom on iOS when tapping buttons
        onTouchStart: () => {},
        style: {
          WebkitTapHighlightColor: "rgba(0,0,0,0)",
          touchAction: "manipulation",
        },
      }
    : {};

  return (
    <Button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className={`w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-3 ${className}`}
      {...buttonProps}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          {isMobile ? "Redirecting..." : "Signing in..."}
        </>
      ) : (
        children || (
          <>
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
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
            Continue with Google
          </>
        )
      )}
    </Button>
  );
}
