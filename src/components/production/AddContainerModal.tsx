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
import { useToast } from "@/components/ui/use-toast";

interface AddContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    container: Omit<
      ContainerResponse,
      "id" | "containerNumber" | "createdAt" | "updatedAt"
    >
  ) => void;
}

export default function AddContainerModal({
  isOpen,
  onClose,
  onAdd,
}: AddContainerModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    locationId?: string;
    description?: string;
    isActive: boolean;
  }>({
    name: "",
    type: "",
    isActive: true,
  });
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        type: "",
        isActive: true,
      });
      fetchLocations();
    }
  }, [isOpen]);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch locations",
        variant: "destructive",
      });
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
    onAdd(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Container</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Container Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
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
              value={formData.type}
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
              checked={formData.isActive}
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
            <Button type="submit">Add Container</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
