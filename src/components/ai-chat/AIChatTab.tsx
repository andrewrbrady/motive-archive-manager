"use client";

import React from "react";
import { AIChatInterface } from "./AIChatInterface";

interface AIChatTabProps {
  entityType: "car" | "project";
  entityId: string;
  entityInfo?: any; // Car or Project data for context
}

export function AIChatTab({
  entityType,
  entityId,
  entityInfo,
}: AIChatTabProps) {
  // Generate a helpful title based on entity type and info
  const getTitle = () => {
    if (entityType === "car" && entityInfo) {
      const { make, model, year } = entityInfo;
      return `AI Assistant - ${year || ""} ${make || ""} ${model || ""}`.trim();
    } else if (entityType === "project" && entityInfo) {
      return `AI Assistant - ${entityInfo.title || "Project"}`;
    }
    return `AI Assistant - ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`;
  };

  const getPlaceholder = () => {
    if (entityType === "car") {
      return "Ask about specifications, history, maintenance, or anything related to this car...";
    } else {
      return "Ask about project details, timeline, deliverables, or anything related to this project...";
    }
  };

  return (
    <div className="w-full h-full">
      <AIChatInterface
        entityType={entityType}
        entityId={entityId}
        title={getTitle()}
        placeholder={getPlaceholder()}
        height="800px"
        showFileAttachments={true}
        settings={{
          model: "gpt-4o-mini",
          temperature: 0.7,
          maxTokens: 1000,
          tools: ["web_search", "file_search"],
        }}
      />
    </div>
  );
}
