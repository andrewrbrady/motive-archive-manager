"use client";

import { useState, useRef, useEffect } from "react";
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
import { Plus, Image as ImageIcon, X, Tag } from "lucide-react";
import { uploadToCloudflare } from "@/lib/cloudflare";
import { LocationResponse } from "@/models/location";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { v4 as uuidv4 } from "uuid";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";

// Define a local interface for our upload tracking
interface FileUploadProgress {
  id: string;
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

interface AddInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<StudioInventoryItem, "id">) => void;
}

export default function AddInventoryItemModal({
  isOpen,
  onClose,
  onAdd,
}: AddInventoryItemModalProps) {
  const [formData, setFormData] = useState<Partial<StudioInventoryItem>>({
    name: "",
    category: "Other",
    manufacturer: "",
    model: "",
    condition: "good",
    isAvailable: true,
    tags: [],
    images: [],
    warrantyExpirationDate: undefined,
    serviceProvider: "",
    serviceContactInfo: "",
    powerRequirements: "",
    dimensions: "",
  });

  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>(
    []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [newTag, setNewTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch locations when the modal opens
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Format dimensions as a string if it's an object with dimensions properties
    let formattedData = { ...formData };

    // If dimensions is being treated as an object with properties, convert it to a string
    if (
      typeof formData.dimensions === "object" &&
      formData.dimensions !== null
    ) {
      const dim = formData.dimensions as any;
      const dimensionParts = [];

      if (dim.width) dimensionParts.push(`W: ${dim.width}${dim.unit || "in"}`);
      if (dim.height)
        dimensionParts.push(`H: ${dim.height}${dim.unit || "in"}`);
      if (dim.depth) dimensionParts.push(`D: ${dim.depth}${dim.unit || "in"}`);
      if (dim.weight)
        dimensionParts.push(`Weight: ${dim.weight}${dim.weightUnit || "lb"}`);

      formattedData.dimensions = dimensionParts.join(", ");
    }

    onAdd(formattedData as Omit<StudioInventoryItem, "id">);
    onClose();
  };

  const handleImageProgress = (progress: FileUploadProgress) => {
    setUploadProgress((prev) =>
      prev.map((p) => (p.id === progress.id ? progress : p))
    );

    // If the image is complete, add it to the form data
    if (progress.status === "complete" && progress.imageUrl) {
      setFormData((prev) => {
        // Create a new images array that only contains string values (no undefined)
        const currentImages = Array.isArray(prev.images)
          ? [...prev.images]
          : [];
        const newImages = [...currentImages, progress.imageUrl].filter(
          Boolean
        ) as string[];

        return {
          ...prev,
          images: newImages,
          primaryImage: prev.primaryImage || progress.imageUrl,
        };
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const uploadId = uuidv4();
      const newProgress: FileUploadProgress = {
        id: uploadId,
        fileName: file.name,
        status: "uploading",
        progress: 0,
        currentStep: "Uploading file",
      };

      setUploadProgress((prev) => [...prev, newProgress]);

      const formData = new FormData();
      formData.append("file", file);

      fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          const completeProgress: FileUploadProgress = {
            ...newProgress,
            status: "complete",
            progress: 100,
            imageUrl: data.url,
          };

          handleImageProgress(completeProgress);

          setFormData((prev) => {
            // Ensure we only have string values in the images array
            const currentImages = Array.isArray(prev.images)
              ? [...prev.images]
              : [];
            const newImages = [...currentImages, data.url].filter(
              Boolean
            ) as string[];

            return {
              ...prev,
              images: newImages,
              primaryImage: prev.primaryImage || data.url,
            };
          });
        })
        .catch((error) => {
          console.error("Error uploading file:", error);
          handleImageProgress({
            ...newProgress,
            status: "error",
            progress: 0,
            error: "Failed to upload file",
          });
        });
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-background border border-border rounded-lg shadow-lg">
          <Dialog.Title className="text-xl font-semibold px-6 py-4 border-b border-border flex items-center justify-between">
            Add New Inventory Item
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="p-6">
            <CustomTabs
              items={[
                {
                  value: "basic",
                  label: "Basic Info",
                  content: (
                    <div className="space-y-4">
                      {/* Basic Information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Name *
                          </label>
                          <Input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Category *
                          </label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                category: value as InventoryCategory,
                              })
                            }
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Camera">Camera</SelectItem>
                              <SelectItem value="Lens">Lens</SelectItem>
                              <SelectItem value="Lighting">Lighting</SelectItem>
                              <SelectItem value="Audio">Audio</SelectItem>
                              <SelectItem value="Grip">Grip</SelectItem>
                              <SelectItem value="Power">Power</SelectItem>
                              <SelectItem value="Storage">Storage</SelectItem>
                              <SelectItem value="Accessories">
                                Accessories
                              </SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Sub-Category
                          </label>
                          <Input
                            type="text"
                            value={formData.subCategory || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                subCategory: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Manufacturer *
                          </label>
                          <Input
                            type="text"
                            value={formData.manufacturer}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                manufacturer: e.target.value,
                              })
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Model *
                          </label>
                          <Input
                            type="text"
                            value={formData.model}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                model: e.target.value,
                              })
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Serial Number
                          </label>
                          <Input
                            type="text"
                            value={formData.serialNumber || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                serialNumber: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Purchase Date
                          </label>
                          <Input
                            type="date"
                            value={
                              formData.purchaseDate
                                ? new Date(formData.purchaseDate)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
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

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Condition *
                          </label>
                          <Select
                            value={formData.condition}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                condition:
                                  value as StudioInventoryItem["condition"],
                              })
                            }
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="excellent">
                                Excellent
                              </SelectItem>
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="fair">Fair</SelectItem>
                              <SelectItem value="poor">Poor</SelectItem>
                              <SelectItem value="needs-repair">
                                Needs Repair
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Location
                          </label>
                          <Select
                            value={formData.location || ""}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                location: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((location) => (
                                <SelectItem
                                  key={location.id}
                                  value={location.id}
                                >
                                  {location.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Notes
                        </label>
                        <Textarea
                          value={formData.notes || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              notes: e.target.value,
                            })
                          }
                          placeholder="Enter any additional notes about this item"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {formData.tags?.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add a tag"
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addTag}
                            disabled={!newTag.trim()}
                          >
                            <Tag className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  value: "financial",
                  label: "Financial",
                  content: (
                    <div className="space-y-4">
                      {/* Financial Information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Purchase Price
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.purchasePrice || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                purchasePrice: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Current Value
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.currentValue || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                currentValue: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Depreciation Rate (% per year)
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={formData.depreciationRate || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                depreciationRate: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              })
                            }
                            placeholder="0.0"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Insurance Value
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.insuranceValue || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                insuranceValue: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  value: "technical",
                  label: "Technical",
                  content: (
                    <div className="space-y-4">
                      {/* Technical Information */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Power Requirements
                        </label>
                        <Input
                          type="text"
                          value={formData.powerRequirements || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              powerRequirements: e.target.value,
                            })
                          }
                          placeholder="e.g., 120V AC, 60Hz, 100W"
                        />
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Dimensions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Dimensions (WxHxD, weight)
                            </label>
                            <input
                              type="text"
                              value={formData.dimensions || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  dimensions: e.target.value,
                                })
                              }
                              placeholder="e.g., W: 10in, H: 5in, D: 3in, Weight: 2lb"
                              className="w-full px-3 py-2 bg-[hsl(var(--background))] rounded border border-[hsl(var(--border))] focus:outline-none focus:border-[hsl(var(--ring))]"
                            />
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                              Enter dimensions in format: W: 10in, H: 5in, D:
                              3in, Weight: 2lb
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Manual URL
                        </label>
                        <Input
                          type="url"
                          value={formData.manualUrl || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              manualUrl: e.target.value,
                            })
                          }
                          placeholder="https://example.com/manual.pdf"
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  value: "maintenance",
                  label: "Maintenance",
                  content: (
                    <div className="space-y-4">
                      {/* Maintenance Information */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Last Maintenance Date
                          </label>
                          <Input
                            type="date"
                            value={
                              formData.lastMaintenanceDate
                                ? new Date(formData.lastMaintenanceDate)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                lastMaintenanceDate: e.target.value
                                  ? new Date(e.target.value)
                                  : undefined,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Warranty Expiration Date
                          </label>
                          <Input
                            type="date"
                            value={
                              formData.warrantyExpirationDate
                                ? new Date(formData.warrantyExpirationDate)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                warrantyExpirationDate: e.target.value
                                  ? new Date(e.target.value)
                                  : undefined,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Service Provider
                        </label>
                        <Input
                          type="text"
                          value={formData.serviceProvider || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              serviceProvider: e.target.value,
                            })
                          }
                          placeholder="e.g., Canon Service Center"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Service Contact Information
                        </label>
                        <Input
                          type="text"
                          value={formData.serviceContactInfo || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              serviceContactInfo: e.target.value,
                            })
                          }
                          placeholder="e.g., support@example.com, (555) 123-4567"
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  value: "images",
                  label: "Images",
                  content: (
                    <div className="space-y-4">
                      {/* Images */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Upload Images
                        </label>
                        <div className="border border-dashed border-border rounded-md p-6 text-center">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            multiple
                            accept="image/*"
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="mx-auto"
                          >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Select Images
                          </Button>
                          <p className="text-sm text-muted-foreground mt-2">
                            Upload images of the inventory item
                          </p>
                        </div>
                      </div>

                      {/* Display uploaded images */}
                      {formData.images && formData.images.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Uploaded Images
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {formData.images.map((image, index) => (
                              <div
                                key={index}
                                className="relative border border-border rounded-md overflow-hidden"
                              >
                                <img
                                  src={image}
                                  alt={`Inventory item ${index + 1}`}
                                  className="w-full h-32 object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      images: prev.images?.filter(
                                        (_, i) => i !== index
                                      ),
                                      primaryImage:
                                        prev.primaryImage === image
                                          ? prev.images?.[0] || undefined
                                          : prev.primaryImage,
                                    }));
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant={
                                    formData.primaryImage === image
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="absolute bottom-2 right-2"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      primaryImage: image,
                                    }));
                                  }}
                                >
                                  {formData.primaryImage === image
                                    ? "Primary"
                                    : "Set as Primary"}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
              defaultValue={activeTab}
              basePath=""
              className="w-full"
            />

            <div className="mt-8 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Add Item</Button>
            </div>
          </form>

          <UploadProgressDialog
            isOpen={isUploading}
            onClose={() => setIsUploading(false)}
            uploadProgress={uploadProgress}
          />
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
