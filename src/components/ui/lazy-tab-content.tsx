"use client";

import React, { lazy, Suspense, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface LazyTabContentProps {
  children: React.ReactNode;
  isActive: boolean;
  fallback?: React.ReactNode;
}

const defaultFallback = (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export function LazyTabContent({
  children,
  isActive,
  fallback = defaultFallback,
}: LazyTabContentProps) {
  const [hasBeenActive, setHasBeenActive] = useState(false);

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  // Only render content if the tab has been active at least once
  if (!hasBeenActive) {
    return null;
  }

  return (
    <Suspense fallback={fallback}>
      <div style={{ display: isActive ? "block" : "none" }}>{children}</div>
    </Suspense>
  );
}

// Higher-order component for creating lazy tab content
export function withLazyContent<P extends object>(
  Component: React.ComponentType<P>
) {
  return function LazyWrapper(props: P & { isActive?: boolean }) {
    const { isActive = false, ...rest } = props;
    return (
      <LazyTabContent isActive={isActive}>
        <Component {...(rest as P)} />
      </LazyTabContent>
    );
  };
}
