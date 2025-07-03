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
import { usePlatforms } from "@/contexts/PlatformContext";
import { PlatformIcon } from "./PlatformIcon";

interface PlatformSelectorProps {
  deliverableId: string;
  initialPlatformId?: string;
  size?: "sm" | "md" | "lg";
  onPlatformChange?: (newPlatformId: string) => void;
}

export function PlatformSelector({
  deliverableId,
  initialPlatformId,
  size = "sm",
  onPlatformChange,
}: PlatformSelectorProps) {
  const [platformId, setPlatformId] = useState<string>(
    initialPlatformId || "__unassigned__"
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useAPI();
  const {
    platforms,
    isLoading: platformsLoading,
    getPlatformById,
  } = usePlatforms();

  const updatePlatform = async (newPlatformId: string) => {
    if (newPlatformId === platformId || !api) return;

    setIsUpdating(true);
    setError(null);

    try {
      // Convert special unassigned value to null for API
      const platformValue =
        newPlatformId === "__unassigned__" ? null : newPlatformId;

      console.log(
        `🎯 Updating platform for deliverable ${deliverableId} to ${platformValue}`
      );

      const updates = {
        platform_id: platformValue,
      };

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 Sending updates:", updates);

      await api.put(`/api/deliverables/${deliverableId}`, updates);

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Platform update successful");

      // Update local state
      setPlatformId(newPlatformId);

      // Call callback if provided
      if (onPlatformChange) {
        onPlatformChange(platformValue || "");
      }
    } catch (err) {
      console.error("❌ Failed to update platform:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update platform"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Get display value for current selection
  const getDisplayValue = () => {
    if (platformId === "__unassigned__") {
      return (
        <span className="text-muted-foreground">No platform assigned</span>
      );
    }
    if (platformId) {
      const selectedPlatform = getPlatformById(platformId);
      if (selectedPlatform) {
        return (
          <div className="flex items-center gap-2">
            <PlatformIcon platform={selectedPlatform} className="h-3 w-3" />
            <span>{selectedPlatform.name}</span>
          </div>
        );
      }
      return "Unknown platform";
    }
    return "Select platform";
  };

  const sizingClasses = {
    sm: "h-7 px-2 text-xs",
    md: "h-8 px-2 text-sm",
    lg: "h-9 px-3 text-sm",
  };

  return (
    <div className="relative">
      <Select
        value={platformId}
        onValueChange={updatePlatform}
        disabled={isUpdating || platformsLoading}
      >
        <SelectTrigger
          className={`border-0 bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-ring ${sizingClasses[size]}`}
        >
          <SelectValue>
            <div className="flex items-center whitespace-nowrap">
              {(isUpdating || platformsLoading) && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              <div className="truncate">{getDisplayValue()}</div>
            </div>
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {/* Option to clear platform */}
          <SelectItem value="__unassigned__" className="text-xs">
            <span className="text-muted-foreground">No platform assigned</span>
          </SelectItem>

          {platforms.map((platform) => (
            <SelectItem
              key={platform._id}
              value={platform._id}
              className="text-xs"
            >
              <div className="flex items-center gap-2">
                <PlatformIcon platform={platform} className="h-3 w-3" />
                <span>{platform.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <div className="text-destructive text-xs mt-1">{error}</div>}
    </div>
  );
}
