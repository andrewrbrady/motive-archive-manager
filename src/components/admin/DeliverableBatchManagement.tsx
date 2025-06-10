"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Copy, Package } from "lucide-react";
import { toast } from "sonner";
import {
  Platform,
  DeliverableType,
  DeliverablePlatform,
  MediaType,
} from "@/types/deliverable";
import { useAPI } from "@/hooks/useAPI";
import { usePlatforms } from "@/contexts/PlatformContext";
import { useMediaTypes } from "@/hooks/useMediaTypes";

// Define batch interfaces locally
interface DeliverableTemplate {
  title: string;
  platform_id?: string;
  platform?: string; // Legacy field
  mediaTypeId?: string;
  type?: string; // Legacy field
  duration?: number;
  aspect_ratio: string;
}

interface BatchTemplate {
  name: string;
  templates: DeliverableTemplate[];
}

interface DeliverableBatchManagementProps {}

// Legacy options for backward compatibility
const platformOptions: Platform[] = [
  "Instagram Reels",
  "Instagram Post",
  "Instagram Story",
  "YouTube",
  "YouTube Shorts",
  "TikTok",
  "Facebook",
  "Bring a Trailer",
  "Other",
];

const typeOptions: DeliverableType[] = [
  "Photo Gallery",
  "Video",
  "Mixed Gallery",
  "Video Gallery",
  "Still",
  "Graphic",
  "feature",
  "promo",
  "review",
  "walkthrough",
  "highlights",
  "Marketing Email",
  "Blog",
  "other",
];

const aspectRatioOptions = ["16:9", "9:16", "1:1", "4:5", "4:3", "3:4"];

export default function DeliverableBatchManagement({}: DeliverableBatchManagementProps) {
  const api = useAPI();
  const { platforms, isLoading: platformsLoading } = usePlatforms();
  const { mediaTypes, isLoading: mediaTypesLoading } = useMediaTypes();

  const [batches, setBatches] = useState<BatchTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for creating/editing batches
  const [batchForm, setBatchForm] = useState<{
    name: string;
    templates: DeliverableTemplate[];
  }>({
    name: "",
    templates: [],
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState<DeliverableTemplate>({
    title: "",
    platform_id: undefined,
    platform: "Instagram Reels", // Fallback for backward compatibility
    mediaTypeId: undefined,
    type: "Video", // Fallback for backward compatibility
    duration: 15,
    aspect_ratio: "9:16",
  });

  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (api) {
      fetchBatches();
    }
  }, [api]);

  const fetchBatches = async () => {
    if (!api) {
      console.log("API client not available");
      setBatches([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Fetching batches...");

      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = (await api.get(
        `/api/admin/deliverable-batches?t=${timestamp}`
      )) as {
        batches: BatchTemplate[];
      };

      console.log("Batches response:", response);
      console.log("Response batches:", response.batches);
      console.log("Number of batches:", response.batches?.length);
      console.log("Setting batches to:", response.batches || []);
      setBatches(response.batches || []);
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("Failed to load deliverable batches from server");
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBatch = async () => {
    if (!api || !batchForm.name.trim() || batchForm.templates.length === 0) {
      toast.error("Please provide a batch name and at least one template");
      return;
    }

    console.log("handleSaveBatch called");
    console.log("batchForm:", batchForm);
    console.log("editingBatch:", editingBatch);

    try {
      setIsCreating(true);

      if (editingBatch) {
        // Update existing batch
        console.log("Updating batch:", editingBatch.name);
        const updateData = {
          oldName: editingBatch.name,
          ...batchForm,
        };
        console.log("Update data:", updateData);
        await api.put("/api/admin/deliverable-batches", updateData);
        toast.success("Batch updated successfully");
      } else {
        // Create new batch
        console.log("Creating new batch with data:", batchForm);
        const response = await api.post(
          "/api/admin/deliverable-batches",
          batchForm
        );
        console.log("Create response:", response);
        toast.success("Batch created successfully");
      }

      fetchBatches();
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving batch:", error);
      toast.error("Failed to save batch");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBatch = async (batchName: string) => {
    if (!api) return;

    if (!confirm(`Are you sure you want to delete the "${batchName}" batch?`)) {
      return;
    }

    try {
      await api.deleteWithBody("/api/admin/deliverable-batches", {
        name: batchName,
      });
      toast.success("Batch deleted successfully");
      fetchBatches();
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast.error("Failed to delete batch");
    }
  };

  const handleDuplicateBatch = (batch: BatchTemplate) => {
    setBatchForm({
      name: `${batch.name} (Copy)`,
      templates: [...batch.templates],
    });
    setEditingBatch(null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setBatchForm({ name: "", templates: [] });
    setTemplateForm({
      title: "",
      platform_id: undefined,
      platform: "Instagram Reels", // Fallback for backward compatibility
      mediaTypeId: undefined,
      type: "Video", // Fallback for backward compatibility
      duration: 15,
      aspect_ratio: "9:16",
    });
    setEditingBatch(null);
    setIsAddingTemplate(false);
    setEditingTemplateIndex(null);
  };

  const handleAddTemplate = () => {
    if (!templateForm.title.trim()) {
      toast.error("Please provide a template title");
      return;
    }

    if (editingTemplateIndex !== null) {
      // Update existing template
      const updatedTemplates = [...batchForm.templates];
      updatedTemplates[editingTemplateIndex] = { ...templateForm };
      setBatchForm((prev) => ({ ...prev, templates: updatedTemplates }));
      setEditingTemplateIndex(null);
    } else {
      // Add new template
      setBatchForm((prev) => ({
        ...prev,
        templates: [...prev.templates, { ...templateForm }],
      }));
    }

    setTemplateForm({
      title: "",
      platform_id: undefined,
      platform: "Instagram Reels",
      mediaTypeId: undefined,
      type: "Video",
      duration: 15,
      aspect_ratio: "9:16",
    });
    setIsAddingTemplate(false);
  };

  const handleEditTemplate = (index: number) => {
    setTemplateForm({ ...batchForm.templates[index] });
    setEditingTemplateIndex(index);
    setIsAddingTemplate(true);
  };

  const handleDeleteTemplate = (index: number) => {
    setBatchForm((prev) => ({
      ...prev,
      templates: prev.templates.filter((_, i) => i !== index),
    }));
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (batch: BatchTemplate) => {
    setBatchForm({
      name: batch.name,
      templates: [...batch.templates],
    });
    setEditingBatch(batch);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading deliverable batches...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Deliverable Batch Templates</h2>
          <p className="text-muted-foreground">
            Manage predefined batch templates for creating multiple deliverables
            at once
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Batch
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBatch ? "Edit Batch Template" : "Create Batch Template"}
              </DialogTitle>
              <DialogDescription>
                Create a template with multiple deliverables that can be applied
                to cars
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Batch Name */}
              <div className="space-y-2">
                <Label htmlFor="batch-name">Batch Name</Label>
                <Input
                  id="batch-name"
                  value={batchForm.name}
                  onChange={(e) =>
                    setBatchForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Standard Car Package"
                />
              </div>

              {/* Templates Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Deliverable Templates
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingTemplate(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Template
                  </Button>
                </div>

                {/* Template Form */}
                {isAddingTemplate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {editingTemplateIndex !== null
                          ? "Edit Template"
                          : "Add Template"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={templateForm.title}
                            onChange={(e) =>
                              setTemplateForm((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            placeholder="e.g., White Room"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Platform</Label>
                          <Select
                            value={templateForm.platform_id || ""}
                            onValueChange={(value) => {
                              const platform = platforms.find(
                                (p) => p._id === value
                              );
                              setTemplateForm((prev) => ({
                                ...prev,
                                platform_id: value,
                                platform:
                                  (platform?.name as Platform) || undefined,
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                              {platformsLoading && (
                                <SelectItem value="loading" disabled>
                                  Loading platforms...
                                </SelectItem>
                              )}
                              {!platformsLoading && platforms.length === 0 && (
                                <SelectItem value="empty" disabled>
                                  No platforms available
                                </SelectItem>
                              )}
                              {!platformsLoading &&
                                platforms.map((platform) => (
                                  <SelectItem
                                    key={platform._id}
                                    value={platform._id}
                                  >
                                    {platform.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Media Type</Label>
                          <Select
                            value={templateForm.mediaTypeId || ""}
                            onValueChange={(value) => {
                              const mediaType = mediaTypes.find(
                                (mt) => mt._id.toString() === value
                              );
                              setTemplateForm((prev) => ({
                                ...prev,
                                mediaTypeId: value,
                                type:
                                  (mediaType?.name as DeliverableType) ||
                                  undefined,
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select media type" />
                            </SelectTrigger>
                            <SelectContent>
                              {mediaTypesLoading && (
                                <SelectItem value="loading" disabled>
                                  Loading media types...
                                </SelectItem>
                              )}
                              {!mediaTypesLoading &&
                                mediaTypes.length === 0 && (
                                  <SelectItem value="empty" disabled>
                                    No media types available
                                  </SelectItem>
                                )}
                              {!mediaTypesLoading &&
                                mediaTypes.map((mediaType) => (
                                  <SelectItem
                                    key={mediaType._id.toString()}
                                    value={mediaType._id.toString()}
                                  >
                                    {mediaType.name}
                                    {mediaType.description && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        - {mediaType.description}
                                      </span>
                                    )}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Aspect Ratio</Label>
                          <Select
                            value={templateForm.aspect_ratio}
                            onValueChange={(value) =>
                              setTemplateForm((prev) => ({
                                ...prev,
                                aspect_ratio: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {aspectRatioOptions.map((ratio) => (
                                <SelectItem key={ratio} value={ratio}>
                                  {ratio}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (seconds)</Label>
                          <Input
                            type="number"
                            value={templateForm.duration || ""}
                            onChange={(e) =>
                              setTemplateForm((prev) => ({
                                ...prev,
                                duration: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              }))
                            }
                            placeholder="15"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleAddTemplate}>
                          {editingTemplateIndex !== null
                            ? "Update Template"
                            : "Add Template"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddingTemplate(false);
                            setEditingTemplateIndex(null);
                            setTemplateForm({
                              title: "",
                              platform_id: undefined,
                              platform: "Instagram Reels",
                              mediaTypeId: undefined,
                              type: "Video",
                              duration: 15,
                              aspect_ratio: "9:16",
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Templates List */}
                <div className="space-y-2">
                  {batchForm.templates.map((template, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{template.title}</h4>
                              <Badge variant="outline">
                                {template.platform_id
                                  ? platforms.find(
                                      (p) => p._id === template.platform_id
                                    )?.name
                                  : template.platform}
                              </Badge>
                              <Badge variant="secondary">
                                {template.mediaTypeId
                                  ? mediaTypes.find(
                                      (mt) =>
                                        mt._id.toString() ===
                                        template.mediaTypeId
                                    )?.name
                                  : template.type}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {template.aspect_ratio}
                              {template.duration
                                ? ` • ${template.duration}s`
                                : ""}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTemplate(index)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTemplate(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {batchForm.templates.length === 0 && (
                    <Alert>
                      <Package className="h-4 w-4" />
                      <AlertDescription>
                        No templates added yet. Click "Add Template" to create
                        your first deliverable template.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveBatch} disabled={isCreating}>
                  {isCreating
                    ? "Saving..."
                    : editingBatch
                      ? "Update Batch"
                      : "Create Batch"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Batches List */}
      <div className="grid gap-4">
        {batches.length === 0 ? (
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              No batch templates created yet. Create your first batch template
              to get started.
            </AlertDescription>
          </Alert>
        ) : (
          batches.map((batch) => (
            <Card key={batch.name}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{batch.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {batch.templates.length} template
                      {batch.templates.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(batch)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateBatch(batch)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBatch(batch.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {batch.templates.map((template, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {template.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {template.platform}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {template.aspect_ratio}
                        {template.duration ? ` • ${template.duration}s` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
