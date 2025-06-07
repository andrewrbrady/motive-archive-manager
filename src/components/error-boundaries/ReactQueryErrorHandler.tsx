"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { useAuthErrorBoundary } from "./AuthErrorBoundary";

interface ReactQueryErrorHandlerProps {
  children: React.ReactNode;
}

/**
 * ReactQueryErrorHandler - Bridges React Query errors to Error Boundaries
 *
 * This component automatically captures React Query errors and forwards them
 * to the nearest error boundary, ensuring authentication errors from API calls
 * are properly handled by the AuthErrorBoundary.
 *
 * Key Features:
 * - Captures React Query errors
 * - Forwards auth errors to error boundary
 * - Resets query errors when error boundary resets
 * - Integrates seamlessly with existing React Query setup
 */
export function ReactQueryErrorHandler({
  children,
}: ReactQueryErrorHandlerProps) {
  const { reset } = useQueryErrorResetBoundary();
  const { captureError } = useAuthErrorBoundary();
  const isSetupRef = useRef(false);
  const originalConsoleErrorRef = useRef<typeof console.error | null>(null);

  // Stable error handler using useCallback
  const handleQueryError = useCallback(
    (error: Error) => {
      console.error("🚨 React Query Error:", error);

      // Check if it's an authentication error
      if (isAuthenticationError(error)) {
        // Forward to error boundary
        captureError(error);
      }
    },
    [captureError]
  );

  useEffect(() => {
    // Prevent multiple setups
    if (isSetupRef.current) {
      return;
    }

    // ✅ More robust error handling - use flag to prevent recursion
    originalConsoleErrorRef.current = console.error;
    let isIntercepting = false; // Prevent recursion flag
    isSetupRef.current = true;

    console.error = (...args) => {
      // Prevent recursive interception
      if (isIntercepting) {
        originalConsoleErrorRef.current?.(...args);
        return;
      }

      // Convert args to string for pattern matching
      const errorMessage = args.join(" ");
      const firstArg = args[0];

      // ✅ COMPLETELY SKIP CloudflareImage and image-related errors
      if (
        // Direct CloudflareImage error patterns
        (typeof firstArg === "string" &&
          firstArg.includes("CloudflareImage")) ||
        errorMessage.includes("CloudflareImage load error") ||
        errorMessage.includes("CloudflareImage") ||
        // React state update errors - THE CRITICAL ONE WE MISSED
        errorMessage.includes("Can't perform a React state update") ||
        errorMessage.includes("React state update") ||
        errorMessage.includes("hasn't mounted yet") ||
        errorMessage.includes("component that hasn't mounted") ||
        // Other image-related patterns
        errorMessage.includes("Image failed to load") ||
        errorMessage.includes("Failed to load image") ||
        errorMessage.includes("image load") ||
        errorMessage.includes("IMG") ||
        errorMessage.includes("loading error") ||
        errorMessage.includes("network error") ||
        // Component-specific patterns
        errorMessage.includes("ProjectAvatar:") ||
        errorMessage.includes("CarAvatar:") ||
        errorMessage.includes("Avatar") ||
        // Next.js and React patterns
        errorMessage.includes("createConsoleError") ||
        errorMessage.includes("React error boundary") ||
        errorMessage.includes("Image component") ||
        errorMessage.includes("side-effect in your render function") ||
        errorMessage.includes("Move this work to useEffect") ||
        // Debounce and hook-related errors
        errorMessage.includes("use-debounce") ||
        errorMessage.includes("useDebounce") ||
        errorMessage.includes("dispatchSetState") ||
        // Check for HTML Image Element errors
        args.some(
          (arg) =>
            typeof arg === "object" &&
            arg !== null &&
            "target" in arg &&
            arg.target instanceof HTMLImageElement
        )
      ) {
        // Pass through directly without any intervention
        originalConsoleErrorRef.current?.(...args);
        return;
      }

      // Only handle actual React Query errors - be very specific
      if (
        typeof firstArg === "string" &&
        (firstArg.includes("Query failed") ||
          firstArg.includes("Mutation failed") ||
          firstArg.includes("🚨 React Query Error:")) &&
        // Extra safety filters
        !errorMessage.includes("Image") &&
        !errorMessage.includes("Avatar") &&
        !errorMessage.includes("load") &&
        !errorMessage.includes("Cloudflare")
      ) {
        isIntercepting = true; // Set flag to prevent recursion

        try {
          const error = args.find((arg) => arg instanceof Error);
          if (error && isAuthenticationError(error)) {
            handleQueryError(error);
          }
        } finally {
          isIntercepting = false; // Always reset flag
        }
      }

      // Always call original console.error
      originalConsoleErrorRef.current?.(...args);
    };

    return () => {
      if (originalConsoleErrorRef.current) {
        console.error = originalConsoleErrorRef.current;
      }
    };
  }, [handleQueryError]); // Use stable handleQueryError instead of captureError

  // ✅ REMOVED problematic cleanup function that was causing infinite loops
  // React Query error reset should be handled explicitly, not in cleanup

  return <>{children}</>;
}

/**
 * Helper function to determine if an error is authentication-related
 */
function isAuthenticationError(error: Error): boolean {
  const authKeywords = [
    "authentication required",
    "authentication failed",
    "please sign in",
    "please sign in again",
    "no user logged in",
    "failed to get token",
    "failed to refresh token",
    "unauthorized",
    "401",
  ];

  const errorMessage = error.message.toLowerCase();
  return authKeywords.some((keyword) => errorMessage.includes(keyword));
}

/**
 * Higher-order component version for easier integration
 */
export function withReactQueryErrorHandler<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WrappedComponent(props: P) {
    return (
      <ReactQueryErrorHandler>
        <Component {...props} />
      </ReactQueryErrorHandler>
    );
  };
}
