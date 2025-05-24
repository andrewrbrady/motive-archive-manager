// components/cars/CarsViewWrapper.tsx
"use client";

import React from "react";
import { Car } from "@/types/car";
import GridView from "./GridView";
import ListView from "./ListView";

interface CarsViewWrapperProps {
  cars: Car[];
  viewMode: "grid" | "list";
  currentSearchParams: string;
  forceGridOnMobile?: boolean;
  actualViewMode?: "grid" | "list";
}

export default function CarsViewWrapper({
  cars,
  viewMode,
  currentSearchParams,
  forceGridOnMobile = false,
  actualViewMode,
}: CarsViewWrapperProps) {
  // On mobile, force grid view if forceGridOnMobile is true
  // On desktop, use the actualViewMode if provided, otherwise use viewMode
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const effectiveViewMode = React.useMemo(() => {
    if (forceGridOnMobile && isMobile) {
      return "grid";
    }
    return actualViewMode || viewMode;
  }, [forceGridOnMobile, isMobile, actualViewMode, viewMode]);

  return effectiveViewMode === "grid" ? (
    <GridView cars={cars} currentSearchParams={currentSearchParams} />
  ) : (
    <ListView cars={cars} currentSearchParams={currentSearchParams} />
  );
}
