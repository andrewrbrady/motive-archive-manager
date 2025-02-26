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
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

  const fetchLocations = async () => {
    try {
      setIsLoadingLocations(true);
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
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
      await onSave(formData);
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
            used: prev.capacity?.used,
            available: prev.capacity?.available,
            ...(child === "total" ? { total: value } : {}),
            ...(child === "used" ? { used: value } : {}),
            ...(child === "available" ? { available: value } : {}),
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Hard Drive</DialogTitle>
        </DialogHeader>

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
                <SelectItem value="Offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <Select
              value={formData.locationId || "none"}
              onValueChange={(value) =>
                handleChange("locationId", value === "none" ? "" : value)
              }
              disabled={isLoadingLocations}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {location.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
