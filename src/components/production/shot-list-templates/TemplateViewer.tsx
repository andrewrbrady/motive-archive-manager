import React from "react";
import { TemplateViewerProps } from "./types";

export function TemplateViewer({ template, onEdit }: TemplateViewerProps) {
  return (
    <div className="p-6 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{template.name}</h3>
        <button onClick={onEdit} className="px-4 py-2 border rounded">
          Edit
        </button>
      </div>
      <p className="text-muted-foreground mb-4">{template.description}</p>
      <p className="text-sm text-muted-foreground">
        Template viewer component - to be implemented in Phase 2
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        {template.shots.length} shots in this template
      </p>
    </div>
  );
}
