"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  StudioInventoryItem,
  StudioInventoryImage,
  InventoryCategory,
  MaintenanceRecord,
  CheckoutRecord,
  Receipt,
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
import { Plus, Image as ImageIcon, X, Tag, Star } from "lucide-react";
import { uploadToCloudflare } from "@/lib/cloudflare";
import { LocationResponse } from "@/models/location";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import { useAPI } from "@/hooks/useAPI";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
  imageUrl?: string;
  currentStep?: string;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

// Define a type for dimensions object used in the form
interface DimensionsObject {
  width?: number;
  height?: number;
  depth?: number;
  weight?: number;
  unit?: string;
  weightUnit?: string;
}

interface EditInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: StudioInventoryItem) => void;
  item: StudioInventoryItem;
}

// Extend StudioInventoryItem for the form state to handle dimensions as an object
interface FormDataType extends Omit<StudioInventoryItem, "dimensions"> {
  dimensions?: DimensionsObject | string;
}

// TypeScript interfaces for API responses
interface ContainersResponse {
  containers?: any[];
}

export default function EditInventoryItemModal({
  isOpen,
  onClose,
  onSave,
  item,
}: EditInventoryItemModalProps) {
  const api = useAPI();
  const [formData, setFormData] = useState<FormDataType>(item);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [newTag, setNewTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize dimensions as an object if it's a string
  useEffect(() => {
    if (item.dimensions && typeof item.dimensions === "string") {
      // Try to parse dimensions string into an object
      const dimensionsObj: DimensionsObject = {};
      const parts = item.dimensions.split(",").map((part) => part.trim());

      parts.forEach((part) => {
        if (part.startsWith("W:")) {
          const match = part.match(/W:\s*(\d+\.?\d*)([a-zA-Z]*)/);
          if (match) {
            dimensionsObj.width = parseFloat(match[1]);
            if (!dimensionsObj.unit && match[2]) dimensionsObj.unit = match[2];
          }
        } else if (part.startsWith("H:")) {
          const match = part.match(/H:\s*(\d+\.?\d*)([a-zA-Z]*)/);
          if (match) {
            dimensionsObj.height = parseFloat(match[1]);
            if (!dimensionsObj.unit && match[2]) dimensionsObj.unit = match[2];
          }
        } else if (part.startsWith("D:")) {
          const match = part.match(/D:\s*(\d+\.?\d*)([a-zA-Z]*)/);
          if (match) {
            dimensionsObj.depth = parseFloat(match[1]);
            if (!dimensionsObj.unit && match[2]) dimensionsObj.unit = match[2];
          }
        } else if (part.toLowerCase().includes("weight:")) {
          const match = part.match(/Weight:\s*(\d+\.?\d*)([a-zA-Z]*)/);
          if (match) {
            dimensionsObj.weight = parseFloat(match[1]);
            if (match[2]) dimensionsObj.weightUnit = match[2];
          }
        }
      });

      setFormData({
        ...item,
        dimensions:
          Object.keys(dimensionsObj).length > 0
            ? dimensionsObj
            : item.dimensions,
      });
    } else {
      setFormData(item);
    }
  }, [item]);

  // Fetch locations when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      fetchContainers();
    }
  }, [isOpen]);

  const fetchLocations = async () => {
    if (!api) return;

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

  const fetchContainers = async () => {
    if (!api) return;

    try {
      const data = (await api.get("containers")) as ContainersResponse;
      setContainers(Array.isArray(data) ? data : data.containers || []);
    } catch (error) {
      console.error("Error fetching containers:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create a copy of the form data
    const formattedData = { ...formData };

    // Format dimensions as a string if it's an object
    if (
      formattedData.dimensions &&
      typeof formattedData.dimensions === "object"
    ) {
      const { width, height, depth, weight, unit, weightUnit } =
        formattedData.dimensions;
      const dimensionsArr = [];

      if (width) dimensionsArr.push(`W: ${width}${unit || ""}`);
      if (height) dimensionsArr.push(`H: ${height}${unit || ""}`);
      if (depth) dimensionsArr.push(`D: ${depth}${unit || ""}`);
      if (weight) dimensionsArr.push(`Weight: ${weight}${weightUnit || ""}`);

      formattedData.dimensions = dimensionsArr.join(", ");
    }

    // Ensure images is an array
    formattedData.images = formattedData.images || [];

    // Cast to StudioInventoryItem since we've handled the dimensions conversion
    onSave(formattedData as StudioInventoryItem);
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
      const newImage = {
        id: progress.fileName,
        url: progress.imageUrl,
        filename: progress.fileName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), newImage.url],
        primaryImage: prev.primaryImage || progress.imageUrl,
      }));
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
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

        // [REMOVED] // [REMOVED] console.log(`Starting upload for ${file.name}`);

        // Upload to Cloudflare
        const result = await uploadToCloudflare(file);
        // [REMOVED] // [REMOVED] console.log(`Upload successful for ${file.name}:`, result);

        // Update progress to complete
        handleImageProgress({
          fileName: file.name,
          progress: 100,
          status: "complete",
          imageUrl: result.url,
        });

        // [REMOVED] // [REMOVED] console.log(`Image added to form data: ${result.url}`);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);

        // Update progress to error
        handleImageProgress({
          fileName: file.name,
          progress: 0,
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    setIsUploading(false);
  };

  // Helper function to safely access dimensions object properties
  const getDimensionValue = (property: keyof DimensionsObject): string => {
    if (!formData.dimensions) return "";
    if (typeof formData.dimensions === "object") {
      return formData.dimensions[property]?.toString() || "";
    }
    return "";
  };

  // Helper function to update dimensions safely
  const updateDimension = (property: keyof DimensionsObject, value: any) => {
    setFormData((prev) => {
      // Create a dimensions object if it doesn't exist or is a string
      const currentDimensions: DimensionsObject =
        typeof prev.dimensions === "object" ? { ...prev.dimensions } : {};

      // Update the specific property
      currentDimensions[property] = value;

      return {
        ...prev,
        dimensions: currentDimensions,
      };
    });
  };

  // Add tag function
  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()],
      });
      setNewTag("");
    }
  };

  // Remove tag function
  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag) => tag !== tagToRemove),
    });
  };

  // Add a custom onOpenChange handler to ensure proper modal behavior
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update the details of this inventory item
            </DialogDescription>
          </DialogHeader>

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
                            Manufacturer
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
                            Quantity *
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.quantity?.toString() || "1"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                            required
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
                            value={formData.location || "none"}
                            onValueChange={(value) => {
                              setFormData({
                                ...formData,
                                location: value === "none" ? undefined : value,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
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

                        {/* Container selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Container
                          </label>
                          <Select
                            value={formData.containerId || "none"}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                containerId:
                                  value === "none" ? undefined : value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select container" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {containers.map((container) => (
                                <SelectItem
                                  key={container.id}
                                  value={container.id}
                                >
                                  {container.name} (#{container.containerNumber}
                                  ) - {container.type}
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
                            Rental Price (per day)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.rentalPrice || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                rentalPrice: e.target.value
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
                              value={
                                typeof formData.dimensions === "string"
                                  ? formData.dimensions
                                  : ""
                              }
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
                            onChange={(e) =>
                              e.target.files && handleFileSelect(e.target.files)
                            }
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
              basePath="#"
              paramName="edit_tab"
              className="w-full"
            />

            <DialogFooter className="mt-8">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <UploadProgressDialog
        isOpen={isUploading}
        onClose={() => setIsUploading(false)}
        uploadProgress={uploadProgress}
      />
    </>
  );
}
