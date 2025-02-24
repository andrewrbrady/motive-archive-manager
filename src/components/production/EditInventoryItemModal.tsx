"use client";

import { useState, useRef } from "react";
import { Dialog } from "@headlessui/react";
import {
  StudioInventoryItem,
  StudioInventoryImage,
  InventoryCategory,
} from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { UploadProgressDialog } from "@/components/UploadProgressDialog";
import { Plus, Image as ImageIcon, X } from "lucide-react";
import { uploadToCloudflare } from "@/lib/cloudflare";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
  imageUrl?: string;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

interface EditInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: StudioInventoryItem) => void;
  item: StudioInventoryItem;
}

export default function EditInventoryItemModal({
  isOpen,
  onClose,
  onSave,
  item,
}: EditInventoryItemModalProps) {
  const [formData, setFormData] = useState<StudioInventoryItem>(item);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleImageProgress = (progress: UploadProgress) => {
    setUploadProgress((prev) => {
      const index = prev.findIndex((p) => p.fileName === progress.fileName);
      if (index === -1) {
        return [...prev, progress];
      }
      const newProgress = [...prev];
      newProgress[index] = progress;
      return newProgress;
    });

    // If the image is complete, add it to the form data
    if (progress.status === "complete" && progress.imageUrl) {
      const newImage: StudioInventoryImage = {
        id: `temp-${Date.now()}`,
        url: progress.imageUrl,
        filename: progress.fileName,
        metadata: progress.metadata || {
          description: "",
          tags: [],
        },
        variants: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, newImage],
        primaryImage: prev.primaryImage || progress.imageUrl,
      }));
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        // Update progress to uploading
        const uploadingProgress: UploadProgress = {
          fileName: file.name,
          progress: 0,
          status: "uploading",
          currentStep: "Uploading to Cloudflare",
        };
        setUploadProgress((prev) => [...prev, uploadingProgress]);

        // Upload to Cloudflare
        const result = await uploadToCloudflare(file);

        // Create the image object
        const newImage: StudioInventoryImage = {
          id: result.id,
          url: result.url,
          filename: file.name,
          metadata: {
            description: "",
            tags: [],
          },
          variants: result.variants.reduce((acc, variant) => {
            acc[variant.split("/").pop() || ""] = variant;
            return acc;
          }, {} as { [key: string]: string }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Update form data with the new image
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, newImage],
          primaryImage: prev.primaryImage || newImage.url,
        }));

        // Update progress to complete
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name
              ? {
                  ...p,
                  status: "complete",
                  progress: 100,
                  imageUrl: newImage.url,
                }
              : p
          )
        );
      } catch (error) {
        console.error("Error uploading image:", error);
        // Update progress to error
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name
              ? {
                  ...p,
                  status: "error",
                  error: "Failed to upload image",
                }
              : p
          )
        );
      }
    }

    setIsUploading(false);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-xl w-full bg-background border border-border rounded-lg p-6 shadow-lg">
          <Dialog.Title className="text-xl font-semibold mb-4 text-foreground">
            Edit Inventory Item
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Images
              </label>
              <div className="grid grid-cols-4 gap-4">
                {formData.images?.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border"
                  >
                    <img
                      src={image.url}
                      alt={`Item image ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          images: prev.images?.filter((_, i) => i !== index),
                          primaryImage:
                            prev.primaryImage === image.url
                              ? prev.images?.[0]?.url
                              : prev.primaryImage,
                        }));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {formData.primaryImage !== image.url && (
                      <button
                        type="button"
                        className="absolute bottom-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            primaryImage: image.url,
                          }));
                        }}
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-border-hover flex items-center justify-center"
                >
                  <Plus className="w-6 h-6 text-foreground-muted" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Name
                </label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value as InventoryCategory,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Camera">Camera</SelectItem>
                    <SelectItem value="Lens">Lens</SelectItem>
                    <SelectItem value="Lighting">Lighting</SelectItem>
                    <SelectItem value="Audio">Audio</SelectItem>
                    <SelectItem value="Grip">Grip</SelectItem>
                    <SelectItem value="Power">Power</SelectItem>
                    <SelectItem value="Storage">Storage</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Manufacturer
                </label>
                <Input
                  type="text"
                  required
                  value={formData.manufacturer}
                  onChange={(e) =>
                    setFormData({ ...formData, manufacturer: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Model
                </label>
                <Input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Serial Number
                </label>
                <Input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, serialNumber: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Condition
                </label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      condition: value as StudioInventoryItem["condition"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="needs-repair">Needs Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Location
                </label>
                <Input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Purchase Date
                </label>
                <Input
                  type="date"
                  value={formData.purchaseDate?.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      purchaseDate: e.target.value
                        ? new Date(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notes
              </label>
              <Textarea
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button type="submit" variant="default">
                Save Changes
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>

      <UploadProgressDialog
        isOpen={isUploading}
        onClose={() => setIsUploading(false)}
        uploadProgress={uploadProgress}
      />
    </Dialog>
  );
}
