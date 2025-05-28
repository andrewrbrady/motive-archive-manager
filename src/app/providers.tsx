"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
// import { LabelsProvider } from "@/contexts/LabelsContext";
// import { FirebaseProvider } from "@/contexts/FirebaseContext";
import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ✅ Lazy load React Query DevTools only in development
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  }))
);

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Reduce default stale time to improve performance
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes (was cacheTime)
            retry: 1, // Reduce retries for faster failures
            refetchOnWindowFocus: false, // Reduce unnecessary refetches
          },
        },
      })
  );

  return (
    <SessionProvider>
      {/* ✅ REMOVED: FirebaseProvider - only used on forgot-password page */}
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {/* ✅ REMOVED: LabelsProvider - only used on 3 production components */}
          {children}
          {/* ✅ Only load DevTools in development and lazy load it */}
          {process.env.NODE_ENV === "development" && (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          )}
        </QueryClientProvider>
      </ThemeProvider>
      {/* ✅ REMOVED: FirebaseProvider closing tag */}
    </SessionProvider>
  );
}
