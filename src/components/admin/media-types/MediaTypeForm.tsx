"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IMediaType } from "@/models/MediaType";

interface MediaTypeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: {
    name: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
  }) => Promise<void>;
  mediaType?: IMediaType | null;
}

export function MediaTypeForm({
  isOpen,
  onClose,
  onSave,
  mediaType,
}: MediaTypeFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes or mediaType changes
  useEffect(() => {
    if (isOpen) {
      if (mediaType) {
        setFormData({
          name: mediaType.name,
          description: mediaType.description || "",
          sortOrder: mediaType.sortOrder,
          isActive: mediaType.isActive,
        });
      } else {
        setFormData({
          name: "",
          description: "",
          sortOrder: 0,
          isActive: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, mediaType]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (isNaN(formData.sortOrder) || formData.sortOrder < 0) {
      newErrors.sortOrder = "Sort order must be a non-negative number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim(),
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
      });
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mediaType ? "Edit Media Type" : "Create New Media Type"}
          </DialogTitle>
          <DialogDescription>
            {mediaType
              ? "Update the media type information below."
              : "Add a new media type for deliverables."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter media type name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <span className="text-sm text-red-500">{errors.name}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Enter media type description (optional)"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) =>
                  handleInputChange("sortOrder", parseInt(e.target.value) || 0)
                }
                placeholder="0"
                className={errors.sortOrder ? "border-red-500" : ""}
              />
              {errors.sortOrder && (
                <span className="text-sm text-red-500">{errors.sortOrder}</span>
              )}
              <span className="text-sm text-muted-foreground">
                Lower numbers appear first in lists
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  handleInputChange("isActive", checked)
                }
              />
              <Label htmlFor="isActive">Active</Label>
              <span className="text-sm text-muted-foreground">
                {formData.isActive
                  ? "Visible in dropdowns"
                  : "Hidden from dropdowns"}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : mediaType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
