"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { FirebaseProvider } from "@/contexts/FirebaseContext";
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

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

export default function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseProvider>
        <ThemeProvider>
          {children}
          {process.env.NODE_ENV === "development" && (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          )}
        </ThemeProvider>
      </FirebaseProvider>
    </QueryClientProvider>
  );
}
