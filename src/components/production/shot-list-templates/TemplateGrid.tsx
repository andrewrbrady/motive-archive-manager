import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ResponsiveImage from "@/components/ui/ResponsiveImage";
import { TemplateGridProps } from "./types";

// Helper function to safely get thumbnail URL
const getThumbnailUrl = (thumbnail: string | undefined): string => {
  if (!thumbnail) return "";
  return thumbnail.endsWith("/public") ? thumbnail : `${thumbnail}/public`;
};

export function TemplateGrid({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onEdit,
  onDelete,
  onDuplicate,
  isLoading,
}: TemplateGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No templates found.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first template to get started.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className={cn(
              "border rounded-lg p-4 cursor-pointer transition-colors",
              selectedTemplate?.id === template.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => onTemplateSelect(template)}
          >
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              <div className="w-16 h-12 flex-shrink-0 rounded overflow-hidden bg-muted">
                {template.thumbnail ? (
                  <ResponsiveImage
                    src={getThumbnailUrl(template.thumbnail)}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{template.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {template.shots.length} shot
                  {template.shots.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(template);
                  }}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(template);
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(template.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
