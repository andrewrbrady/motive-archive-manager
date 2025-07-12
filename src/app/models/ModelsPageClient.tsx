"use client";

import React, { useState, useMemo } from "react";
import { VehicleModelClient } from "@/types/model";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, X, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NewModelDialog from "@/components/models/NewModelDialog";
import EditModelDialog from "@/components/models/EditModelDialog";
import { useAPI } from "@/hooks/useAPI";
import { MARKET_SEGMENTS, BODY_STYLES } from "@/types/model";
import { JsonImportUtility } from "@/components/common/JsonImportUtility";
import { FileJson } from "lucide-react";

interface ModelsPageClientProps {
  models: VehicleModelClient[];
}

export default function ModelsPageClient({
  models: initialModels,
}: ModelsPageClientProps) {
  const api = useAPI();
  const router = useRouter();

  // State management
  const [models, setModels] = useState(initialModels);
  const [isNewModelDialogOpen, setIsNewModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<VehicleModelClient | null>(
    null
  );

  // Filtering state
  const [searchTerm, setSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState<string>("all");
  const [marketSegmentFilter, setMarketSegmentFilter] = useState<string>("all");
  const [bodyStyleFilter, setBodyStyleFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Get unique makes for filter dropdown
  const uniqueMakes = useMemo(() => {
    const makes = [...new Set(models.map((model) => model.make))];
    return makes.sort();
  }, [models]);

  // Filter models based on current filters
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesSearch =
        searchTerm === "" ||
        model.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.generation?.code
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        model.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMake = makeFilter === "all" || model.make === makeFilter;
      const matchesMarketSegment =
        marketSegmentFilter === "all" ||
        model.market_segment === marketSegmentFilter;
      const matchesBodyStyle =
        bodyStyleFilter === "all" ||
        model.generation?.body_styles?.includes(bodyStyleFilter);

      return (
        matchesSearch && matchesMake && matchesMarketSegment && matchesBodyStyle
      );
    });
  }, [models, searchTerm, makeFilter, marketSegmentFilter, bodyStyleFilter]);

  // Handle loading state
  if (!api) return <div>Loading...</div>;

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setMakeFilter("all");
    setMarketSegmentFilter("all");
    setBodyStyleFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm !== "" ||
    makeFilter !== "all" ||
    marketSegmentFilter !== "all" ||
    bodyStyleFilter !== "all";

  // CRUD operations
  const handleDelete = async (modelId: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;

    try {
      await api.models.delete(modelId);
      setModels(models.filter((model) => model._id !== modelId));
      toast.success("Model deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting model:", error);
      toast.error("Failed to delete model");
    }
  };

  const handleCreate = async (newModel: Partial<VehicleModelClient>) => {
    try {
      const createdModel = (await api.models.create(
        newModel
      )) as VehicleModelClient;
      setModels([...models, createdModel]);
      setIsNewModelDialogOpen(false);
      toast.success("Model created successfully");
      router.refresh();
    } catch (error) {
      console.error("Error creating model:", error);
      toast.error("Failed to create model");
    }
  };

  const handleEdit = (model: VehicleModelClient) => {
    setEditingModel(model);
  };

  const handleUpdate = async (updatedModel: Partial<VehicleModelClient>) => {
    if (!editingModel) return;

    try {
      const result = (await api.models.update(
        editingModel._id,
        updatedModel
      )) as VehicleModelClient;
      setModels(
        models.map((model) => (model._id === editingModel._id ? result : model))
      );
      setEditingModel(null);
      toast.success("Model updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error updating model:", error);
      toast.error("Failed to update model");
    }
  };

  const handleBatchImport = async (jsonData: any[]) => {
    if (!api) {
      toast.error("API not available");
      return;
    }

    try {
      const response = await api.models.batchCreate(jsonData);
      const result = response as {
        models: VehicleModelClient[];
        count: number;
        message: string;
      };

      // Add the new models to the existing list
      setModels([...models, ...result.models]);

      toast.success(`Successfully imported ${result.count} models`);
      router.refresh();
    } catch (error: any) {
      console.error("Error importing models:", error);

      // Handle validation errors with details
      if (error.response?.data?.details) {
        const errorDetails = error.response.data.details;
        toast.error(
          `Import failed: ${errorDetails.slice(0, 3).join(", ")}${errorDetails.length > 3 ? "..." : ""}`
        );
      } else {
        toast.error(error.message || "Failed to import models");
      }

      throw error; // Re-throw to prevent modal from closing
    }
  };

  const formatYearRange = (yearRange?: { start: number; end?: number }) => {
    if (!yearRange) return "N/A";
    if (!yearRange.end) return `${yearRange.start}-Present`;
    return `${yearRange.start}-${yearRange.end}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageTitle title="Vehicle Models Management">
            <div className="flex gap-2 ml-auto">
              <JsonImportUtility
                config={{
                  title: "Import Models from JSON",
                  description:
                    "Upload a JSON file or paste JSON data to import multiple vehicle models at once.",
                  expectedType: "models",
                  buttonText: "Batch Import",
                  buttonVariant: "outline",
                  buttonSize: "default",
                }}
                onImport={handleBatchImport}
              />
              <Button onClick={() => setIsNewModelDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Model
              </Button>
            </div>
          </PageTitle>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Filter Row */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <label className="text-sm font-medium mb-2 block">Make</label>
                <Select value={makeFilter} onValueChange={setMakeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Makes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Makes</SelectItem>
                    {uniqueMakes.map((make) => (
                      <SelectItem key={make} value={make}>
                        {make}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Market Segment
                </label>
                <Select
                  value={marketSegmentFilter}
                  onValueChange={setMarketSegmentFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Segments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Segments</SelectItem>
                    {MARKET_SEGMENTS.map((segment) => (
                      <SelectItem key={segment} value={segment}>
                        {segment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Body Style
                </label>
                <Select
                  value={bodyStyleFilter}
                  onValueChange={setBodyStyleFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Body Styles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Body Styles</SelectItem>
                    {BODY_STYLES.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Showing {filteredModels.length} of {models.length} models
            </span>
            {hasActiveFilters && <span>Filters active</span>}
          </div>

          {/* Models Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Make & Model</TableHead>
                  <TableHead>Generation</TableHead>
                  <TableHead>Year Range</TableHead>
                  <TableHead>Body Styles</TableHead>
                  <TableHead>Market Segment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {hasActiveFilters
                          ? "No models match your filters"
                          : "No models found"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredModels.map((model) => (
                    <TableRow key={model._id}>
                      <TableCell className="font-medium">
                        <div>
                          <div
                            className="font-semibold hover:text-primary cursor-pointer"
                            onClick={() => router.push(`/models/${model._id}`)}
                          >
                            {model.make} {model.model}
                          </div>
                          {model.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {model.description.substring(0, 100)}
                              {model.description.length > 100 && "..."}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{model.generation?.code || "N/A"}</TableCell>
                      <TableCell>
                        {formatYearRange(model.generation?.year_range)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {model.generation?.body_styles
                            ?.slice(0, 3)
                            .map((style) => (
                              <Badge
                                key={style}
                                variant="secondary"
                                className="text-xs"
                              >
                                {style}
                              </Badge>
                            ))}
                          {model.generation?.body_styles &&
                            model.generation.body_styles.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{model.generation.body_styles.length - 3}
                              </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {model.market_segment && (
                          <Badge variant="outline">
                            {model.market_segment}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/models/${model._id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(model)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(model._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <NewModelDialog
        open={isNewModelDialogOpen}
        onOpenChange={setIsNewModelDialogOpen}
        onSubmit={handleCreate}
      />

      {editingModel && (
        <EditModelDialog
          open={true}
          onOpenChange={(open: boolean) => !open && setEditingModel(null)}
          model={editingModel}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
