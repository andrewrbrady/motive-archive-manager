"use client";

import React from "react";
import { FileManager } from "./FileManager";

interface FileManagerTabProps {
  entityType: "car" | "project";
  entityId: string;
  entityInfo?: {
    name?: string;
    make?: string;
    model?: string;
    year?: string;
  };
}

export function FileManagerTab({
  entityType,
  entityId,
  entityInfo,
}: FileManagerTabProps) {
  const getTitle = () => {
    if (entityType === "car" && entityInfo) {
      const { make, model, year } = entityInfo;
      return `Files for ${make || ""} ${model || ""} ${year || ""}`.trim();
    } else if (entityType === "project" && entityInfo?.name) {
      return `Files for ${entityInfo.name}`;
    }
    return `${entityType === "car" ? "Car" : "Project"} Files`;
  };

  return (
    <div className="space-y-6">
      {/* Header with context */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{getTitle()}</h2>
        <p className="text-muted-foreground">
          Manage files uploaded for AI assistance with this {entityType}. These
          files provide context for AI conversations and can include maintenance
          records, documentation, manuals, and other relevant documents.
        </p>
      </div>

      {/* File Manager */}
      <FileManager
        entityType={entityType}
        entityId={entityId}
        maxHeight="calc(100vh - 300px)"
        showUpload={true}
      />
    </div>
  );
}
