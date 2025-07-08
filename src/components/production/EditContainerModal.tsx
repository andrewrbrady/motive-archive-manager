"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContainerResponse } from "@/models/container";
import { LocationResponse } from "@/models/location";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";
import { LoadingContainer } from "@/components/ui/loading-container";

// TypeScript interfaces for API responses
interface LocationsResponse {
  data?: LocationResponse[];
}

interface EditContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (container: ContainerResponse) => void;
  container: ContainerResponse;
}

export default function EditContainerModal({
  isOpen,
  onClose,
  onSave,
  container,
}: EditContainerModalProps) {
  const api = useAPI();
  const [formData, setFormData] = useState<Partial<ContainerResponse>>({});
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when container changes
  useEffect(() => {
    if (container) {
      setFormData({
        ...container,
      });
    }
  }, [container]);

  // Fetch locations when the modal opens
  useEffect(() => {
    if (isOpen && api) {
      fetchLocations();
    }
  }, [isOpen, api]);

  const fetchLocations = async () => {
    if (!api) return;

    try {
      setIsLoading(true);
      const response = await api.get("locations");
      const data = Array.isArray(response) ? response : [];
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Failed to fetch locations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value === "none" ? undefined : value,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...container,
      ...formData,
    } as ContainerResponse);
    onClose();
  };

  // Show loading state if API not ready
  if (!api) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="h-64 flex items-center justify-center">
            <LoadingContainer />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Container</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Container Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              placeholder="Enter container name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Container Type *</Label>
            <Input
              id="type"
              name="type"
              value={formData.type || ""}
              onChange={handleChange}
              placeholder="e.g., Box, Case, Pelican, Cabinet"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationId">Location</Label>
            <Select
              value={formData.locationId || "none"}
              onValueChange={(value) => handleSelectChange("locationId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive !== false}
              onCheckedChange={(checked) =>
                handleCheckboxChange("isActive", checked === true)
              }
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
