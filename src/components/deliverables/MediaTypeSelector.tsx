"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useMediaTypes } from "@/hooks/useMediaTypes";

interface MediaTypeSelectorProps {
  deliverableId: string;
  initialMediaTypeId?: string;
  size?: "sm" | "md" | "lg";
  onMediaTypeChange?: (newMediaTypeId: string) => void;
}

export function MediaTypeSelector({
  deliverableId,
  initialMediaTypeId,
  size = "sm",
  onMediaTypeChange,
}: MediaTypeSelectorProps) {
  const [mediaTypeId, setMediaTypeId] = useState<string>(
    initialMediaTypeId || ""
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useAPI();
  const { mediaTypes } = useMediaTypes();

  const updateMediaType = async (newMediaTypeId: string) => {
    if (newMediaTypeId === mediaTypeId || !api) return;

    setIsUpdating(true);
    setError(null);

    try {
      console.log(
        `🎯 Updating media type for deliverable ${deliverableId} to ${newMediaTypeId}`
      );

      const updates: any = {
        mediaTypeId: newMediaTypeId,
      };

      // Also update legacy type field for backward compatibility
      const selectedMediaType = mediaTypes.find(
        (mt) => mt._id.toString() === newMediaTypeId
      );
      if (selectedMediaType) {
        const legacyTypeMapping: Record<string, string> = {
          Video: "Video",
          "Photo Gallery": "Photo Gallery",
          "Mixed Gallery": "Mixed Gallery",
          "Video Gallery": "Video Gallery",
        };
        updates.type = legacyTypeMapping[selectedMediaType.name] || "other";
      }

      console.log("🔄 Sending updates:", updates);

      await api.put(`/api/deliverables/${deliverableId}`, updates);

      console.log("✅ Media type update successful");

      // Update local state
      setMediaTypeId(newMediaTypeId);

      // Call callback if provided
      if (onMediaTypeChange) {
        onMediaTypeChange(newMediaTypeId);
      }
    } catch (err) {
      console.error("❌ Failed to update media type:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update media type"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Get display value for current selection
  const getDisplayValue = () => {
    if (mediaTypeId) {
      const mediaType = mediaTypes.find(
        (mt) => mt._id.toString() === mediaTypeId
      );
      return mediaType ? mediaType.name : "Select media type";
    }
    return "Select media type";
  };

  const sizingClasses = {
    sm: "h-7 px-2 text-xs",
    md: "h-8 px-2 text-sm",
    lg: "h-9 px-3 text-sm",
  };

  return (
    <div className="relative">
      <Select
        value={mediaTypeId}
        onValueChange={updateMediaType}
        disabled={isUpdating}
      >
        <SelectTrigger
          className={`border-0 bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-ring ${sizingClasses[size]}`}
        >
          <SelectValue>
            <span className="flex items-center whitespace-nowrap">
              {isUpdating && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              <span className="truncate">{getDisplayValue()}</span>
            </span>
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {mediaTypes.map((mediaType) => (
            <SelectItem
              key={mediaType._id.toString()}
              value={mediaType._id.toString()}
              className="text-xs"
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

      {error && <div className="text-destructive text-xs mt-1">{error}</div>}
    </div>
  );
}
