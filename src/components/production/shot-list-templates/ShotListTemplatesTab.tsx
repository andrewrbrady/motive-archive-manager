import React, { Suspense, lazy } from "react";
import { useTemplateManager } from "./hooks/useTemplateManager";
import { ShotListTemplatesTabProps } from "./types";
import { Loader2 } from "lucide-react";

// Lazy load heavy components for better performance
const TemplateEditor = lazy(() =>
  import("./TemplateEditor").then((m) => ({ default: m.TemplateEditor }))
);
const TemplateViewer = lazy(() =>
  import("./TemplateViewer").then((m) => ({ default: m.TemplateViewer }))
);
const ImageBrowser = lazy(() =>
  import("./ImageBrowser").then((m) => ({ default: m.ImageBrowser }))
);

// Import lightweight components normally
import { TemplateHeader } from "./TemplateHeader";
import { TemplateGrid } from "./TemplateGrid";

// Loading component for suspense fallbacks
function ComponentLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function ShotListTemplatesTab({
  shouldCreateTemplate = false,
}: ShotListTemplatesTabProps) {
  const {
    // State
    templates,
    isLoading,
    isCreating,
    editingTemplate,
    selectedTemplate,

    // Template operations
    handleTemplateSelect,
    handleCreateNew,
    handleEdit,
    handleCancelEdit,
    handleSave,
    handleDelete,
    handleDuplicate,
  } = useTemplateManager(shouldCreateTemplate);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <TemplateHeader onCreateNew={handleCreateNew} isCreating={isCreating} />

      <div className="flex flex-1 gap-6 mt-6">
        {/* Left Panel - Template List */}
        <div className="w-1/3">
          <TemplateGrid
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            isLoading={isLoading}
          />
        </div>

        {/* Right Panel - Template Content */}
        <div className="flex-1">
          {isCreating || editingTemplate ? (
            <Suspense fallback={<ComponentLoader />}>
              <TemplateEditor
                template={editingTemplate}
                isCreating={isCreating}
                onSave={handleSave}
                onCancel={handleCancelEdit}
              />
            </Suspense>
          ) : selectedTemplate ? (
            <Suspense fallback={<ComponentLoader />}>
              <TemplateViewer
                template={selectedTemplate}
                onEdit={() => handleEdit(selectedTemplate)}
              />
            </Suspense>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Select a template from the list to view its details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
