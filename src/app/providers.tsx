"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LabelsProvider } from "@/contexts/LabelsContext";
import { FirebaseProvider } from "@/contexts/FirebaseContext";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <SessionProvider>
      <FirebaseProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <LabelsProvider>{children}</LabelsProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </ThemeProvider>
      </FirebaseProvider>
    </SessionProvider>
  );
}
