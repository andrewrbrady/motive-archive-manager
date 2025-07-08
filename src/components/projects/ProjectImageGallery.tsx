"use client";

import React from "react";
import { GenericImageGallery } from "@/components/common/GenericImageGallery";
import { Project } from "@/types/project";

interface ProjectImageGalleryProps {
  projectId: string;
  showFilters?: boolean;
  projectInfo?: Project;
  onFilterOptionsChange?: (options: Record<string, string[]>) => void;
  onUploadStarted?: () => void;
  onUploadEnded?: () => void;
}

export function ProjectImageGallery({
  projectId,
  showFilters = true,
  projectInfo,
  onFilterOptionsChange,
  onUploadStarted,
  onUploadEnded,
}: ProjectImageGalleryProps) {
  return (
    <GenericImageGallery
      entityId={projectId}
      entityType="project"
      showFilters={showFilters}
      entityInfo={projectInfo}
      onFilterOptionsChange={onFilterOptionsChange}
      onUploadStarted={onUploadStarted}
      onUploadEnded={onUploadEnded}
    />
  );
}
