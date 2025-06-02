"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  ImageIcon,
  Plus,
  Check,
  FolderOpen,
} from "lucide-react";
import {
  Inspection,
  CreateInspectionRequest,
  ChecklistItem,
} from "@/types/inspection";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import InspectionImageUpload from "@/components/ui/InspectionImageUpload";
import DropboxImageBrowser from "@/components/ui/DropboxImageBrowser";

interface InspectionFormProps {
  carId: string;
  inspection?: Inspection | null;
  onSave: () => void;
  onCancel: () => void;
}

interface UploadedImage {
  id: string;
  cloudflareId: string;
  filename: string;
  url: string;
}

export default function InspectionForm({
  carId,
  inspection,
  onSave,
  onCancel,
}: InspectionFormProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDropboxDialogOpen, setIsDropboxDialogOpen] = useState(false);

  // Get the current user's name for inspector field
  const currentUserName = session?.user?.name || "Unknown User";

  const [formData, setFormData] = useState<CreateInspectionRequest>({
    title: inspection?.title || "",
    description: inspection?.description || "",
    status: inspection?.status || "pass",
    inspectedBy: inspection?.inspectedBy || currentUserName,
    inspectionImageIds: inspection?.inspectionImageIds || [],
    dropboxVideoFolderUrl: inspection?.dropboxVideoFolderUrl || "",
    dropboxImageFolderUrl: inspection?.dropboxImageFolderUrl || "",
    checklistItems: inspection?.checklistItems || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsLoading(true);

    try {
      const url = inspection
        ? `/api/inspections/${inspection._id}`
        : `/api/cars/${carId}/inspections`;

      const method = inspection ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save inspection");
      }

      onSave();
    } catch (error) {
      console.error("Error saving inspection:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save inspection"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateInspectionRequest,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUploadSuccess = (uploadedImages: UploadedImage[]) => {
    const newImageIds = uploadedImages.map((img) => img.cloudflareId);
    setFormData((prev) => ({
      ...prev,
      inspectionImageIds: [...(prev.inspectionImageIds || []), ...newImageIds],
    }));
    setIsUploadDialogOpen(false);
    toast.success(`${uploadedImages.length} image(s) uploaded successfully`);
  };

  const removeImage = (imageId: string) => {
    setFormData((prev) => ({
      ...prev,
      inspectionImageIds: (prev.inspectionImageIds || []).filter(
        (id) => id !== imageId
      ),
    }));
  };

  const handleUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`);
  };

  const handleDropboxImagesImported = (
    imageIds: string[],
    folderUrl?: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      inspectionImageIds: [...prev.inspectionImageIds, ...imageIds],
      // Automatically set the folder URL if provided and not already set
      ...(folderUrl &&
        !prev.dropboxImageFolderUrl && { dropboxImageFolderUrl: folderUrl }),
    }));
    setIsDropboxDialogOpen(false);

    const message =
      folderUrl && !formData.dropboxImageFolderUrl
        ? `${imageIds.length} image(s) imported from Dropbox and folder URL saved`
        : `${imageIds.length} image(s) imported from Dropbox`;

    toast.success(message);
  };

  // Checklist management functions
  const addChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(), // Simple ID generation
      description: "",
      completed: false,
    };
    setFormData((prev) => ({
      ...prev,
      checklistItems: [...prev.checklistItems, newItem],
    }));
  };

  const updateChecklistItem = (
    id: string,
    field: keyof ChecklistItem,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
              ...(field === "completed" && value === true
                ? { dateCompleted: new Date() }
                : field === "completed" && value === false
                  ? { dateCompleted: undefined }
                  : {}),
            }
          : item
      ),
    }));
  };

  const removeChecklistItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.filter((item) => item.id !== id),
    }));
  };

  // Ensure inspectionImageIds is always an array
  const imageIds = formData.inspectionImageIds || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {inspection && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {inspection ? "Edit Inspection" : "New Inspection"}
          </h2>
          <p className="text-muted-foreground">
            {inspection
              ? "Update inspection details"
              : "Create a new inspection report"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-xl font-semibold">Inspection Details</h3>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="e.g., Pre-purchase Inspection"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inspectedBy">Inspector Name</Label>
          <div className="px-3 py-2 bg-muted/50 border border-input rounded-md text-sm">
            {currentUserName}
          </div>
        </div>

        {/* Description and Checklist Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Description Column */}
          <div className="space-y-2">
            <Label htmlFor="description">Description / Notes</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Add notes about the inspection..."
              rows={6}
              className="min-h-[150px]"
            />
          </div>

          {/* Checklist Column */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Inspection Checklist</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChecklistItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {formData.checklistItems.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {formData.checklistItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="group flex items-start gap-2 p-3 border rounded-md bg-background"
                  >
                    <div className="flex items-center gap-1 mt-0.5">
                      <Checkbox
                        id={`checklist-${item.id}`}
                        checked={item.completed}
                        onCheckedChange={(checked) =>
                          updateChecklistItem(item.id, "completed", checked)
                        }
                      />
                      <span className="text-xs text-muted-foreground min-w-[20px]">
                        {index + 1}.
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateChecklistItem(
                            item.id,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Enter checklist item..."
                        className={`text-sm border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 ${
                          item.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      />
                      {item.completed && item.dateCompleted && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Check className="h-3 w-3 inline mr-1" />
                          {new Date(item.dateCompleted).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(item.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-muted rounded-md p-6 text-center text-muted-foreground">
                <div className="text-2xl mb-2">📋</div>
                <p className="text-sm">No checklist items yet</p>
                <p className="text-xs mt-1">
                  Click "Add Item" to create your inspection checklist
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Inspection Images</h3>

          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog
              open={isUploadDialogOpen}
              onOpenChange={setIsUploadDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Upload Inspection Images</DialogTitle>
                  <DialogDescription>
                    Select images to upload for this inspection
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto py-4">
                  <InspectionImageUpload
                    onImagesUploaded={handleImageUploadSuccess}
                    onError={handleUploadError}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isDropboxDialogOpen}
              onOpenChange={setIsDropboxDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Import from Dropbox
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Import Images from Dropbox</DialogTitle>
                  <DialogDescription>
                    Browse a Dropbox folder and import images for this
                    inspection
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto py-4">
                  <DropboxImageBrowser
                    onImagesImported={handleDropboxImagesImported}
                    onError={(error) => toast.error(error)}
                    initialFolderUrl={formData.dropboxImageFolderUrl}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Display uploaded images */}
          {imageIds.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {imageIds.map((imageId) => (
                <div
                  key={imageId}
                  className="relative rounded-lg overflow-hidden border group"
                >
                  <img
                    src={`https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${imageId}/w=400,q=85`}
                    alt="Inspection image"
                    className="w-full h-auto object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                    onClick={() => removeImage(imageId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {imageIds.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No images uploaded yet. Click "Upload Images" to add inspection
                photos.
              </p>
            </div>
          )}
        </div>

        {/* Dropbox Integration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Media Sources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dropboxVideoFolder">
                Dropbox Video Folder URL
              </Label>
              <Input
                id="dropboxVideoFolder"
                value={formData.dropboxVideoFolderUrl}
                onChange={(e) =>
                  handleInputChange("dropboxVideoFolderUrl", e.target.value)
                }
                placeholder="https://www.dropbox.com/sh/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropboxImageFolder">
                Dropbox Image Folder URL
              </Label>
              <Input
                id="dropboxImageFolder"
                value={formData.dropboxImageFolderUrl}
                onChange={(e) =>
                  handleInputChange("dropboxImageFolderUrl", e.target.value)
                }
                placeholder="https://www.dropbox.com/sh/..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {inspection ? "Update Inspection" : "Create Inspection"}
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
