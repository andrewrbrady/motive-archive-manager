"use client";

import React, { useEffect, useCallback, useRef, useMemo } from "react";
import { GenericImageGallery } from "@/components/common/GenericImageGallery";

interface CarImageGalleryProps {
  carId: string;
  showFilters?: boolean;
  vehicleInfo?: any;
  onFilterOptionsChange?: (options: Record<string, string[]>) => void;
  onUploadStarted?: () => void;
  onUploadEnded?: () => void;
}

export function CarImageGallery({
  carId,
  showFilters = true,
  vehicleInfo,
  onFilterOptionsChange,
  onUploadStarted,
  onUploadEnded,
}: CarImageGalleryProps) {
  return (
    <GenericImageGallery
      entityId={carId}
      entityType="car"
      showFilters={showFilters}
      entityInfo={vehicleInfo}
      onFilterOptionsChange={onFilterOptionsChange}
      onUploadStarted={onUploadStarted}
      onUploadEnded={onUploadEnded}
    />
  );
}
