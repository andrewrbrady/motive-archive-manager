"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { FirebaseProvider } from "@/contexts/FirebaseContext";
import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthErrorBoundary } from "@/components/error-boundaries/AuthErrorBoundary";
import { ReactQueryErrorHandler } from "@/components/error-boundaries/ReactQueryErrorHandler";

// ✅ Lazy load React Query DevTools only in development
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  }))
);

interface ProvidersProps {
  children: React.ReactNode;
}

// Create a client with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // ✅ Enable retry on auth errors, but limit attempts
      retry: (failureCount, error: any) => {
        // Don't retry auth errors more than once
        if (error?.message?.toLowerCase().includes("authentication")) {
          return failureCount < 1;
        }
        // Retry other errors up to 3 times
        return failureCount < 3;
      },
      // ✅ Configure retry delay
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // ✅ Don't retry mutations by default
      retry: false,
    },
  },
});

export default function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseProvider>
        <ThemeProvider>
          {/* ✅ Global Auth Error Boundary catches all authentication errors */}
          <AuthErrorBoundary
            onError={(error, errorInfo) => {
              // Log auth errors for debugging
              console.error("🚨 Auth Error Boundary triggered:", {
                error,
                errorInfo,
              });

              // In production, send to error tracking service
              if (process.env.NODE_ENV === "production") {
                // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
                console.error("Production auth error:", { error, errorInfo });
              }
            }}
          >
            {/* ✅ React Query Error Handler bridges query errors to error boundary */}
            <ReactQueryErrorHandler>
              {children}
              {process.env.NODE_ENV === "development" && (
                <Suspense fallback={null}>
                  <ReactQueryDevtools initialIsOpen={false} />
                </Suspense>
              )}
            </ReactQueryErrorHandler>
          </AuthErrorBoundary>
        </ThemeProvider>
      </FirebaseProvider>
    </QueryClientProvider>
  );
}
