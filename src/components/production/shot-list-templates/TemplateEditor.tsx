import React from "react";
import { TemplateEditorProps } from "./types";

export function TemplateEditor({
  template,
  isCreating,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        {isCreating ? "Create New Template" : "Edit Template"}
      </h3>
      <p className="text-muted-foreground">
        Template editor component - to be implemented in Phase 2
      </p>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave({})}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 border rounded">
          Cancel
        </button>
      </div>
    </div>
  );
}
