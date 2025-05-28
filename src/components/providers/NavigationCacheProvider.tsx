"use client";

import React from "react";

interface NavigationCacheProviderProps {
  children: React.ReactNode;
}

/**
 * Navigation Cache Provider - Minimal setup for fast navigation
 */
export function NavigationCacheProvider({
  children,
}: NavigationCacheProviderProps) {
  // No aggressive preloading or monitoring - just pass through children
  return <>{children}</>;
}
