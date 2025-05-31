"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useEffect } from "react";
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

  useEffect(() => {
    // Global error handler for React Query
    const handleQueryError = (error: Error) => {
      console.error("🚨 React Query Error:", error);

      // Check if it's an authentication error
      if (isAuthenticationError(error)) {
        // Forward to error boundary
        captureError(error);
      }
    };

    // Set up global error handling for React Query
    // This will catch errors that aren't handled by individual queries
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Check if the error is from React Query and contains auth keywords
      const errorMessage = args.join(" ");
      if (
        errorMessage.includes("Query failed") ||
        errorMessage.includes("Mutation failed")
      ) {
        const error = args.find((arg) => arg instanceof Error);
        if (error && isAuthenticationError(error)) {
          handleQueryError(error);
        }
      }
      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, [captureError]);

  useEffect(() => {
    // When error boundary resets, also reset React Query errors
    // This ensures that queries can be retried after auth issues are resolved
    return () => {
      reset();
    };
  }, [reset]);

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
