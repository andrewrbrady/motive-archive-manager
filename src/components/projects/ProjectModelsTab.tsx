"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Car,
  MoreHorizontal,
  Search,
  Grid3X3,
  Columns,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { Project } from "@/types/project";
import { VehicleModelClient } from "@/types/model";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAPI } from "@/hooks/useAPI";

interface ProjectModelsTabProps {
  project: Project;
  onProjectUpdate: () => void;
  initialModels?: VehicleModelClient[]; // Optional pre-fetched models data for SSR optimization
}

// Model Card Component for Project Models
function ProjectModelCard({
  model,
  onUnlink,
}: {
  model: VehicleModelClient;
  onUnlink: (modelId: string) => void;
}) {
  const getMarketSegmentColor = (segment?: string) => {
    switch (segment?.toLowerCase()) {
      case "luxury":
        return "bg-purple-100 text-purple-800";
      case "sports":
        return "bg-red-100 text-red-800";
      case "economy":
        return "bg-green-100 text-green-800";
      case "electric":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const generateModelTitle = () => {
    return [
      model.make,
      model.model,
      model.generation?.code ? `(${model.generation.code})` : null,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const getYearRangeText = () => {
    const start = model.generation?.year_range?.start;
    const end = model.generation?.year_range?.end;

    if (!start) return "Unknown";
    if (!end) return `${start}-Present`;
    return `${start}-${end}`;
  };

  return (
    <div className="bg-background rounded-lg border border-border-primary overflow-hidden hover:border-border-secondary transition-colors relative group">
      {/* Header with model info */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground truncate">
              {generateModelTitle()}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {getYearRangeText()}
            </p>
          </div>

          {/* Actions Menu */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 bg-background/90 hover:bg-background border border-border/20 hover:border-border/30"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/models/${model._id}`}>View Model Details</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUnlink(model._id)}
                  className="text-red-600"
                >
                  Unlink from Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="space-y-3">
          {/* Market Segment */}
          {model.market_segment && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Segment:</span>
              <Badge className={getMarketSegmentColor(model.market_segment)}>
                {model.market_segment}
              </Badge>
            </div>
          )}

          {/* Body Styles */}
          {model.generation?.body_styles &&
            model.generation.body_styles.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-sm text-muted-foreground">
                  Body Styles:
                </span>
                <div className="flex flex-wrap gap-1">
                  {model.generation.body_styles.map((style, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          {/* Engine Options Count */}
          {model.engine_options && model.engine_options.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Engines:</span>
              <span className="text-sm font-medium">
                {model.engine_options.length} option
                {model.engine_options.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Trims Count */}
          {model.generation?.trims && model.generation.trims.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Trims:</span>
              <span className="text-sm font-medium">
                {model.generation.trims.length} variant
                {model.generation.trims.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Description */}
          {model.description && (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {model.description}
            </div>
          )}
        </div>
      </div>

      {/* Footer with creation date */}
      <div className="px-4 py-2 bg-muted/30 border-t">
        <span className="text-xs text-muted-foreground">
          Added {format(new Date(model.created_at), "MMM d, yyyy")}
        </span>
      </div>
    </div>
  );
}

// Models Selection Dialog
function LinkModelDialog({
  open,
  onOpenChange,
  onLink,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (modelId: string) => void;
  projectId: string;
}) {
  const api = useAPI();
  const [availableModels, setAvailableModels] = useState<VehicleModelClient[]>(
    []
  );
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableModels = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get project models to exclude them
      const projectModelsResponse = (await api.get(
        `projects/${projectId}/models`
      )) as any;
      const projectModelIds = new Set(
        projectModelsResponse.models?.map((model: any) => model._id) || []
      );

      // Fetch all available models
      const searchParams = new URLSearchParams({
        limit: "100",
        ...(searchTerm && { search: searchTerm }),
      });

      const data = (await api.get(`models?${searchParams.toString()}`)) as any;

      // Filter out models already in project
      const filteredModels = (data.models || []).filter(
        (model: VehicleModelClient) => !projectModelIds.has(model._id)
      );

      setAvailableModels(filteredModels);
    } catch (error) {
      console.error("Error fetching available models:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch available models";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setAvailableModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && api) {
      fetchAvailableModels();
    }
  }, [open, searchTerm, projectId, api]);

  const handleLinkSelected = async () => {
    if (selectedModels.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one model to link",
        variant: "destructive",
      });
      return;
    }

    try {
      for (const modelId of selectedModels) {
        await onLink(modelId);
      }
      setSelectedModels(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error("Error linking models:", error);
    }
  };

  const toggleModelSelection = (modelId: string) => {
    const newSelection = new Set(selectedModels);
    if (newSelection.has(modelId)) {
      newSelection.delete(modelId);
    } else {
      newSelection.add(modelId);
    }
    setSelectedModels(newSelection);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Models to Project</DialogTitle>
          <DialogDescription>
            Select vehicle models to attach to this project. These models will
            be available in the copywriter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search models by make, model, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Models List */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAvailableModels}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : availableModels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No available models found</p>
                {searchTerm && (
                  <p className="text-sm mt-1">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableModels.map((model) => (
                  <div
                    key={model._id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedModels.has(model._id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border-secondary"
                    }`}
                    onClick={() => toggleModelSelection(model._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {model.make} {model.model}
                          {model.generation?.code &&
                            ` (${model.generation.code})`}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {model.generation?.year_range?.start}
                          {model.generation?.year_range?.end
                            ? `-${model.generation.year_range.end}`
                            : "-Present"}
                        </p>
                        {model.market_segment && (
                          <Badge className="mt-2" variant="outline">
                            {model.market_segment}
                          </Badge>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedModels.has(model._id)}
                        onChange={() => toggleModelSelection(model._id)}
                        className="ml-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLinkSelected}
            disabled={selectedModels.size === 0}
          >
            Link {selectedModels.size} Model
            {selectedModels.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectModelsTab({
  project,
  onProjectUpdate,
  initialModels,
}: ProjectModelsTabProps) {
  const api = useAPI();
  const [projectModels, setProjectModels] = useState<VehicleModelClient[]>(
    initialModels || []
  );
  const [loadingProjectModels, setLoadingProjectModels] =
    useState(!initialModels);
  const [isLinkModelOpen, setIsLinkModelOpen] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [isLinkingModel, setIsLinkingModel] = useState(false);
  const [gridColumns, setGridColumns] = useState(3); // Default to 3 columns for models

  const fetchProjectModels = useCallback(async () => {
    try {
      setLoadingProjectModels(true);
      console.time("ProjectModelsTab-fetchProjectModels");

      if (!api) {
        throw new Error("No authenticated API found");
      }

      const data = (await api.get(`projects/${project._id}/models`)) as {
        models?: VehicleModelClient[];
      };

      console.log("ProjectModelsTab: Fetched models data:", {
        modelsCount: data.models?.length || 0,
        sampleModel: data.models?.[0]
          ? {
              id: data.models[0]._id,
              make: data.models[0].make,
              model: data.models[0].model,
              generation: data.models[0].generation?.code,
            }
          : null,
      });

      setProjectModels(data.models || []);
    } catch (error) {
      console.error("Error fetching project models:", error);
      toast({
        title: "Error",
        description: "Failed to fetch project models. Please try again.",
        variant: "destructive",
      });
      setProjectModels([]);
    } finally {
      setLoadingProjectModels(false);
      console.timeEnd("ProjectModelsTab-fetchProjectModels");
    }
  }, [api, project._id]);

  // Fetch project models on mount if not provided initially
  useEffect(() => {
    if (!initialModels && api) {
      fetchProjectModels();
    }
  }, [fetchProjectModels, initialModels, api]);

  const handleLinkModels = async () => {
    setIsLinkModelOpen(true);
  };

  const handleLinkModel = async (modelId: string) => {
    try {
      setIsLinkingModel(true);

      if (!api) {
        throw new Error("No authenticated API found");
      }

      await api.post(`projects/${project._id}/models`, {
        modelId,
      });

      toast({
        title: "Success",
        description: "Model linked to project successfully",
      });

      // Refresh project models
      await fetchProjectModels();
      onProjectUpdate();
    } catch (error) {
      console.error("Error linking model to project:", error);
      toast({
        title: "Error",
        description: "Failed to link model to project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLinkingModel(false);
    }
  };

  const handleUnlinkModel = async (modelId: string) => {
    try {
      if (!api) {
        throw new Error("No authenticated API found");
      }

      await api.delete(`projects/${project._id}/models?modelId=${modelId}`);

      toast({
        title: "Success",
        description: "Model unlinked from project successfully",
      });

      // Refresh project models
      await fetchProjectModels();
      onProjectUpdate();
    } catch (error) {
      console.error("Error unlinking model from project:", error);
      toast({
        title: "Error",
        description: "Failed to unlink model from project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getGridClass = (columns: number) => {
    switch (columns) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 3:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      case 4:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      default:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    }
  };

  if (loadingProjectModels) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Models</h2>
          <p className="text-muted-foreground">
            Vehicle models attached to this project ({projectModels.length})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Grid Size Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Grid Layout</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGridColumns(1)}>
                <Columns className="h-4 w-4 mr-2" />1 Column
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGridColumns(2)}>
                <Columns className="h-4 w-4 mr-2" />2 Columns
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGridColumns(3)}>
                <Columns className="h-4 w-4 mr-2" />3 Columns
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGridColumns(4)}>
                <Columns className="h-4 w-4 mr-2" />4 Columns
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleLinkModels} disabled={isLinkingModel}>
            <Plus className="h-4 w-4 mr-2" />
            Link Models
          </Button>
        </div>
      </div>

      {/* Models Grid */}
      {projectModels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Models Linked
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              This project doesn't have any vehicle models linked yet. Link
              models to make their specifications available in the copywriter.
            </p>
            <Button onClick={handleLinkModels}>
              <Plus className="h-4 w-4 mr-2" />
              Link Your First Model
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-6 ${getGridClass(gridColumns)}`}>
          {projectModels.map((model) => (
            <ProjectModelCard
              key={model._id}
              model={model}
              onUnlink={handleUnlinkModel}
            />
          ))}
        </div>
      )}

      {/* Link Model Dialog */}
      <LinkModelDialog
        open={isLinkModelOpen}
        onOpenChange={setIsLinkModelOpen}
        onLink={handleLinkModel}
        projectId={project._id!}
      />
    </div>
  );
}
