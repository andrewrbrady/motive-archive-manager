"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LabelsProvider } from "@/contexts/LabelsContext";
import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { usePathname, useSearchParams } from "next/navigation";

interface ProvidersProps {
  children: React.ReactNode;
}

// Simple global navigation progress indicator
function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Show progress on route change
    setIsNavigating(true);

    // Hide progress after delay
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <>
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary/50 animate-pulse transition-all duration-300 ease-in-out" />
      )}
    </>
  );
}

export function Providers({ children }: ProvidersProps) {
  // Create a client
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false, // default true
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationEvents />
          <LabelsProvider>{children}</LabelsProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
