"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { FirebaseProvider } from "@/contexts/FirebaseContext";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { CarDetailsProvider } from "@/contexts/CarDetailsContext";
import React, { lazy, Suspense, useState, useEffect } from "react";
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

// Create query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time of 5 minutes for better performance
      staleTime: 1000 * 60 * 5,
      // Cache time of 10 minutes
      gcTime: 1000 * 60 * 10,
      // Don't retry failed requests immediately
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for 5xx errors
        return failureCount < 2;
      },
      // Reduce refetch frequency
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
    },
  },
});

// Client-only DevTools component to prevent hydration mismatch
function DevTools() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} />
    </Suspense>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ReactQueryErrorHandler>
          <ThemeProvider>
            <FirebaseProvider>
              <PlatformProvider>
                <CarDetailsProvider>{children}</CarDetailsProvider>
              </PlatformProvider>
            </FirebaseProvider>
          </ThemeProvider>
          <DevTools />
        </ReactQueryErrorHandler>
      </QueryClientProvider>
    </AuthErrorBoundary>
  );
}
