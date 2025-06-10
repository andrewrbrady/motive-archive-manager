"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAPI } from "@/hooks/useAPI";
import { usePlatforms } from "@/contexts/PlatformContext";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useMediaTypes } from "@/hooks/useMediaTypes";

// Define interfaces for the batch system
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

interface BatchSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  carId: string;
  onBatchApplied: () => void;
}

export default function BatchSelectorModal({
  isOpen,
  onClose,
  carId,
  onBatchApplied,
}: BatchSelectorModalProps) {
  const api = useAPI();
  const { platforms, getPlatformByName } = usePlatforms();
  const { mediaTypes } = useMediaTypes();
  const { data: session } = useSession();

  const [batches, setBatches] = useState<BatchTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchTemplate | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      fetchBatches();
    }
  }, [isOpen]);

  const fetchBatches = async () => {
    if (!api) {
      console.log("API not available in BatchSelectorModal");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Fetching batches from admin API...");

      const response = (await api.get("/api/admin/deliverable-batches")) as {
        batches: BatchTemplate[];
        success: boolean;
      };

      console.log("Batches response:", response);
      setBatches(response.batches || []);
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("Failed to load deliverable batches");
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyBatch = async (batch: BatchTemplate) => {
    if (!api) return;

    // Check if user is authenticated
    if (!session?.user?.id) {
      toast.error("You must be signed in to create deliverables");
      return;
    }

    // Check if platforms and media types are loaded
    if (platforms.length === 0) {
      toast.error("Platforms data not loaded. Please try again in a moment.");
      return;
    }

    if (mediaTypes.length === 0) {
      toast.error("Media types data not loaded. Please try again in a moment.");
      return;
    }

    try {
      setIsApplying(true);

      // Convert batch templates to deliverables
      const now = new Date();
      const defaultDeadline = new Date(now);
      defaultDeadline.setDate(defaultDeadline.getDate() + 7);
      const defaultReleaseDate = new Date(defaultDeadline);

      const deliverables = batch.templates.map(
        (template: DeliverableTemplate) => {
          console.log(`Processing template: "${template.title}"`);

          // Handle platform assignment (convert platform_id or legacy platform name)
          let platformValue: string | undefined = template.platform;
          let platformId: string | undefined = template.platform_id;

          // If template has platform_id, use it and get name
          if (template.platform_id) {
            const platform = platforms.find(
              (p) => p._id === template.platform_id
            );
            if (platform) {
              platformValue = platform.name;
              platformId = platform._id;
            }
          }
          // If template has legacy platform name but no platform_id, try to find matching platform
          else if (template.platform && !template.platform_id) {
            const matchingPlatform = getPlatformByName(template.platform);
            if (matchingPlatform) {
              platformId = matchingPlatform._id;
              platformValue = matchingPlatform.name;
            }
          }

          // Handle media type assignment
          let mediaTypeId: string | undefined = template.mediaTypeId;
          let typeValue: string = template.type || "Video";

          // If template has mediaTypeId, use it and get name
          if (template.mediaTypeId) {
            const mediaType = mediaTypes.find(
              (mt) => mt._id.toString() === template.mediaTypeId
            );
            if (mediaType) {
              typeValue = mediaType.name;
            }
          }
          // If template has legacy type but no mediaTypeId, try to find matching media type
          else if (template.type && !template.mediaTypeId) {
            const matchingMediaType = mediaTypes.find(
              (mt) => mt.name.toLowerCase() === template.type?.toLowerCase()
            );
            if (matchingMediaType) {
              mediaTypeId = matchingMediaType._id.toString();
            }
          }

          return {
            title: template.title || "Untitled",
            description: `Auto-generated from ${batch.name} batch template`,
            platform_id: platformId,
            platform: platformValue || "Other", // Legacy field for compatibility
            mediaTypeId: mediaTypeId,
            type: typeValue, // Legacy field for compatibility
            duration: template.duration || 0,
            aspect_ratio: template.aspect_ratio || "16:9",
            firebase_uid: session.user?.id || "",
            editor: "Unassigned",
            status: "not_started" as const,
            edit_dates: [],
            edit_deadline: defaultDeadline,
            release_date: defaultReleaseDate,
            tags: [],
            car_id: carId,
          };
        }
      );

      console.log("Creating batch deliverables:", deliverables);

      const result = (await api.post(`/api/cars/${carId}/deliverables/batch`, {
        deliverables,
        source: "admin_batch_template",
        batchName: batch.name,
      })) as any;

      toast.success(
        `Successfully created ${result.count || deliverables.length} deliverables from "${batch.name}" batch`
      );

      onBatchApplied();
      onClose();
    } catch (error) {
      console.error("Error applying batch:", error);
      toast.error(
        `Failed to apply batch template: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsApplying(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const getPlatformName = (template: DeliverableTemplate) => {
    if (template.platform_id) {
      const platform = platforms.find((p) => p._id === template.platform_id);
      return platform?.name || "Unknown Platform";
    }
    return template.platform || "Unknown Platform";
  };

  const getMediaTypeName = (template: DeliverableTemplate) => {
    if (template.mediaTypeId) {
      const mediaType = mediaTypes.find(
        (mt) => mt._id.toString() === template.mediaTypeId
      );
      return mediaType?.name || "Unknown Media Type";
    }
    return template.type || "Unknown Media Type";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply Batch Template</DialogTitle>
          <DialogDescription>
            Select a batch template from your admin panel to create multiple
            deliverables for this car
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">
                Loading batch templates...
              </p>
            </div>
          ) : batches.length === 0 ? (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                No batch templates available. Create batch templates in the
                Admin section first.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {batches.map((batch) => (
                <Card
                  key={batch.name}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedBatch?.name === batch.name
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedBatch(
                      selectedBatch?.name === batch.name ? null : batch
                    )
                  }
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{batch.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {batch.templates.length} deliverable
                          {batch.templates.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyBatch(batch);
                          }}
                          disabled={isApplying}
                        >
                          {isApplying ? "Applying..." : "Apply Batch"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {batch.templates.map((template, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {template.title}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {getPlatformName(template)}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {getMediaTypeName(template)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {template.aspect_ratio}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {template.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(template.duration)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedBatch?.name === batch.name && (
                      <div className="mt-4 p-3 bg-primary/10 rounded border border-primary/20">
                        <p className="text-sm text-primary font-medium">
                          Preview: This will create {batch.templates.length}{" "}
                          deliverable
                          {batch.templates.length !== 1 ? "s" : ""} for this car
                        </p>
                        <ul className="text-xs text-muted-foreground mt-2 list-disc list-inside">
                          {batch.templates.map((template, index) => (
                            <li key={index}>
                              {template.title} ({getPlatformName(template)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {selectedBatch && (
            <Button
              onClick={() => handleApplyBatch(selectedBatch)}
              disabled={isApplying}
            >
              {isApplying
                ? "Applying Batch..."
                : `Apply "${selectedBatch.name}"`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
