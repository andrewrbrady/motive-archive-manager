"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog } from "@headlessui/react";
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

export default function EditInventoryItemModal({
  isOpen,
  onClose,
  onSave,
  item,
}: EditInventoryItemModalProps) {
  const [formData, setFormData] = useState<FormDataType>(item);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
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
          images: [...(prev.images || []), newImage.url],
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

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-xl w-full bg-background border border-border rounded-lg shadow-lg">
          <Dialog.Title className="text-xl font-semibold px-6 py-4 border-b border-border flex items-center justify-between">
            Edit Inventory Item
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
            <Tabs
              defaultValue="basic"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="mb-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
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
                        <SelectItem value="Accessories">Accessories</SelectItem>
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
                        setFormData({ ...formData, model: e.target.value })
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
                      Condition *
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
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          location: value === "none" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location" />
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
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Add any additional notes about this item"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags?.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              tags: formData.tags?.filter(
                                (_, i) => i !== index
                              ),
                            })
                          }
                          className="hover:text-destructive"
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTag.trim()) {
                          e.preventDefault();
                          setFormData({
                            ...formData,
                            tags: [...(formData.tags || []), newTag.trim()],
                          });
                          setNewTag("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (newTag.trim()) {
                          setFormData({
                            ...formData,
                            tags: [...(formData.tags || []), newTag.trim()],
                          });
                          setNewTag("");
                        }
                      }}
                      variant="outline"
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                {/* Financial Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Purchase Price
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
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
                      min="0"
                      step="0.01"
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
                      Depreciation Rate (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.depreciationRate || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          depreciationRate: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Insurance Value
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
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
              </TabsContent>

              <TabsContent value="technical" className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Width
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getDimensionValue("width")}
                      onChange={(e) =>
                        updateDimension(
                          "width",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Height
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getDimensionValue("height")}
                      onChange={(e) =>
                        updateDimension(
                          "height",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Depth
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getDimensionValue("depth")}
                      onChange={(e) =>
                        updateDimension(
                          "depth",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Weight
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getDimensionValue("weight")}
                      onChange={(e) =>
                        updateDimension(
                          "weight",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Unit
                    </label>
                    <Select
                      value={
                        typeof formData.dimensions === "object"
                          ? formData.dimensions.unit || "in"
                          : "in"
                      }
                      onValueChange={(value) => updateDimension("unit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">inches</SelectItem>
                        <SelectItem value="cm">centimeters</SelectItem>
                        <SelectItem value="mm">millimeters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Weight Unit
                    </label>
                    <Select
                      value={
                        typeof formData.dimensions === "object"
                          ? formData.dimensions.weightUnit || "lb"
                          : "lb"
                      }
                      onValueChange={(value) =>
                        updateDimension("weightUnit", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select weight unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lb">pounds</SelectItem>
                        <SelectItem value="kg">kilograms</SelectItem>
                        <SelectItem value="g">grams</SelectItem>
                      </SelectContent>
                    </Select>
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
              </TabsContent>

              <TabsContent value="maintenance" className="space-y-4">
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
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Service Contact Info
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
                      placeholder="Phone, email, or website"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-4">
                {/* Images */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Images
                  </label>
                  <div className="grid grid-cols-4 gap-4">
                    {Array.isArray(formData.images) &&
                      formData.images.map((image, index) => {
                        // For backward compatibility, handle both string and object images
                        const imageUrl =
                          typeof image === "string"
                            ? image
                            : (image as any).url || "";
                        const imageId =
                          typeof image === "string"
                            ? `img-${index}`
                            : (image as any).id || `img-${index}`;

                        return (
                          <div
                            key={imageId}
                            className="relative aspect-square rounded-lg overflow-hidden border border-border"
                          >
                            <img
                              src={imageUrl}
                              alt={`Item image ${index + 1}`}
                              className="object-cover w-full h-full"
                            />
                            <button
                              type="button"
                              className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  images: prev.images?.filter(
                                    (_, i) => i !== index
                                  ),
                                  primaryImage:
                                    prev.primaryImage === imageUrl
                                      ? prev.images && prev.images.length > 1
                                        ? typeof prev.images[0] === "string"
                                          ? prev.images[0]
                                          : (prev.images[0] as any).url || ""
                                        : undefined
                                      : prev.primaryImage,
                                }));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </button>
                            {formData.primaryImage !== imageUrl && (
                              <button
                                type="button"
                                className="absolute bottom-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    primaryImage: imageUrl,
                                  }));
                                }}
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
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
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-6">
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
