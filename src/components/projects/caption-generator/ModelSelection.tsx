"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ModelSelectionProps {
  projectModels: any[];
  selectedModelIds: string[];
  loadingModels: boolean;
  onModelSelection: (modelId: string) => void;
  onSelectAllModels: () => void;
  // Collapsible props
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function ModelSelection({
  projectModels,
  selectedModelIds,
  loadingModels,
  onModelSelection,
  onSelectAllModels,
  isOpen = true,
  onToggle,
}: ModelSelectionProps) {
  const formatModelName = (model: any) => {
    const parts = [
      model.make,
      model.model,
      model.generation?.code ? `(${model.generation.code})` : null,
    ].filter(Boolean);
    return parts.join(" ");
  };

  const getMarketSegmentColor = (segment?: string) => {
    switch (segment?.toLowerCase()) {
      case "luxury":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "sports":
        return "bg-red-100 text-red-800 border-red-200";
      case "economy":
        return "bg-green-100 text-green-800 border-green-200";
      case "electric":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getYearRangeText = (model: any) => {
    const start = model.generation?.year_range?.start;
    const end = model.generation?.year_range?.end;

    if (!start) return "Unknown";
    if (!end) return `${start}-Present`;
    return `${start}-${end}`;
  };

  const renderContent = () => {
    if (loadingModels) {
      return (
        <div className="text-sm text-[hsl(var(--foreground-muted))]">
          Loading models...
        </div>
      );
    }

    if (projectModels.length === 0) {
      return (
        <div className="text-center py-6 text-[hsl(var(--foreground-muted))]">
          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium mb-1">
            No models linked to project
          </p>
          <p className="text-xs">
            Link vehicle models to this project to generate captions with their
            specifications and attributes
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-3">
          {projectModels.map((model) => {
            const isSelected = selectedModelIds.includes(model._id);

            return (
              <button
                key={model._id}
                onClick={() => onModelSelection(model._id)}
                className={`flex items-start space-x-3 p-3 border rounded-lg transition-all text-left w-full ${
                  isSelected
                    ? "border-blue-500 border-2"
                    : "border-[hsl(var(--border-subtle))] hover:border-white hover:bg-muted/30"
                }`}
              >
                {/* Model Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[hsl(var(--foreground))] dark:text-white">
                    {formatModelName(model)}
                  </div>
                  <div className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                    {getYearRangeText(model)}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {model.market_segment && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${getMarketSegmentColor(model.market_segment)}`}
                      >
                        {model.market_segment}
                      </Badge>
                    )}

                    {model.generation?.body_styles &&
                      model.generation.body_styles.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {model.generation.body_styles.length} body style
                          {model.generation.body_styles.length !== 1 ? "s" : ""}
                        </Badge>
                      )}

                    {model.engine_options &&
                      model.engine_options.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {model.engine_options.length} engine
                          {model.engine_options.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 p-0 h-auto font-medium text-[hsl(var(--foreground))] dark:text-white hover:bg-transparent"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Settings className="h-4 w-4" />
              Select Models for Caption
              {selectedModelIds.length > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {selectedModelIds.length}
                </span>
              )}
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAllModels}
            className="border-[hsl(var(--border))]"
          >
            {selectedModelIds.length === projectModels.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>

        <CollapsibleContent>{renderContent()}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}
