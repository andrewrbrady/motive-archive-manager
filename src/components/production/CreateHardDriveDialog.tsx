"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HardDriveData } from "@/models/hard-drive";
import { LocationResponse } from "@/models/location";
import { MapPin } from "lucide-react";
import { UrlModal } from "@/components/ui/url-modal";
import { useAPI } from "@/hooks/useAPI";

interface CreateHardDriveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<HardDriveData>) => Promise<void>;
}

export default function CreateHardDriveDialog({
  isOpen,
  onClose,
  onSave,
}: CreateHardDriveDialogProps) {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [formData, setFormData] = useState<Partial<HardDriveData>>({
    label: "",
    systemName: "",
    type: "HDD",
    interface: "USB",
    capacity: {
      total: 0,
      used: 0,
    },
    status: "Available",
    locationId: "",
  });

  // Fetch locations when the component mounts
  useEffect(() => {
    if (isOpen && api) {
      fetchLocations();
    }
  }, [isOpen, api]);

  const fetchLocations = async () => {
    if (!api) {
      console.error("API client not available");
      return;
    }

    try {
      setIsLoadingLocations(true);
      const data = (await api.get("locations")) as LocationResponse[];
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Format the data for the API
      const apiFormattedData = {
        ...formData,
        // Add description field that API expects
        description: `${formData.type} ${formData.interface} Drive`,
        // Ensure name field is set from label for API compatibility
        name: formData.label,
        // Ensure rawAssetIds is initialized even if empty
        rawAssetIds: [],
      };

      await onSave(apiFormattedData);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create hard drive"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");

      if (parent === "capacity") {
        // Handle capacity specifically since we know its structure
        setFormData((prev) => ({
          ...prev,
          capacity: {
            total: prev.capacity?.total || 0,
            used: prev.capacity?.used || 0,
            ...(child === "total" ? { total: value } : {}),
            ...(child === "used" ? { used: value } : {}),
          },
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  if (!api) {
    return null; // Don't render if API is not available
  }

  return (
    <UrlModal
      paramName="createDrive"
      paramValue="true"
      onClose={onClose}
      title="Add Hard Drive"
      preserveParams={["tab", "page", "limit", "search", "status"]}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Label</label>
          <Input
            value={formData.label}
            onChange={(e) => handleChange("label", e.target.value)}
            placeholder="Enter label"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">System Name</label>
          <Input
            value={formData.systemName}
            onChange={(e) => handleChange("systemName", e.target.value)}
            placeholder="Enter system name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <Select
            value={formData.type}
            onValueChange={(value) => handleChange("type", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HDD">HDD</SelectItem>
              <SelectItem value="SSD">SSD</SelectItem>
              <SelectItem value="NVMe">NVMe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Interface</label>
          <Select
            value={formData.interface}
            onValueChange={(value) => handleChange("interface", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interface" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USB">USB</SelectItem>
              <SelectItem value="SATA">SATA</SelectItem>
              <SelectItem value="NVMe">NVMe</SelectItem>
              <SelectItem value="Thunderbolt">Thunderbolt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Total Capacity (GB)</label>
          <Input
            type="number"
            value={formData.capacity?.total}
            onChange={(e) =>
              handleChange("capacity.total", parseInt(e.target.value))
            }
            placeholder="Enter total capacity"
            required
            min="0"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Used Capacity (GB)</label>
          <Input
            type="number"
            value={formData.capacity?.used}
            onChange={(e) =>
              handleChange("capacity.used", parseInt(e.target.value))
            }
            placeholder="Enter used capacity"
            min="0"
            max={formData.capacity?.total}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="In Use">In Use</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
              <SelectItem value="Damaged">Damaged</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <Select
            value={formData.locationId}
            onValueChange={(value) => handleChange("locationId", value)}
            disabled={isLoadingLocations}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingLocations ? (
                <SelectItem value="loading" disabled>
                  Loading locations...
                </SelectItem>
              ) : locations.length === 0 ? (
                <SelectItem value="none" disabled>
                  No locations found
                </SelectItem>
              ) : (
                locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {location.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </UrlModal>
  );
}
