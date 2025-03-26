"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LabelsProvider } from "@/contexts/LabelsContext";
import React from "react";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <LabelsProvider>{children}</LabelsProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
