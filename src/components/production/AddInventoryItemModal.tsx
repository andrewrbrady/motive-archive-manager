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
import { StudioInventoryItem, InventoryCategory } from "@/types/inventory";
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
import { UploadProgressDialog } from "@/components/UploadProgressDialog";
import { Image as ImageIcon, X, Tag } from "lucide-react";
import { LocationResponse } from "@/models/location";
import { Badge } from "@/components/ui/badge";
import { v4 as uuidv4 } from "uuid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadToCloudflare } from "@/lib/cloudflare";

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
    quantity: 1,
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
  const [containers, setContainers] = useState<any[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [newTag, setNewTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch locations and containers
  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      fetchContainers();
    } else {
      // Reset form data when modal is closed
      console.log("Resetting form data on modal close");
      setFormData({
        name: "",
        category: "Other",
        manufacturer: "",
        model: "",
        condition: "good",
        isAvailable: true,
        quantity: 1,
        tags: [],
        images: [],
        warrantyExpirationDate: undefined,
        serviceProvider: "",
        serviceContactInfo: "",
        powerRequirements: "",
        dimensions: "",
      });
      setNewTag("");
      setActiveTab("basic");
      setUploadProgress([]);
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

  const fetchContainers = async () => {
    try {
      const response = await fetch("/api/containers");
      if (!response.ok) throw new Error("Failed to fetch containers");
      const data = await response.json();
      setContainers(data);
    } catch (error) {
      console.error("Error fetching containers:", error);
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

    // Log the form data before submission
    console.log("Submitting form data:", formattedData);

    // Check if required fields are present
    if (!formattedData.name) {
      console.error("Required field missing: name");
      return;
    }
    if (!formattedData.category) {
      console.error("Required field missing: category");
      return;
    }
    if (!formattedData.model) {
      console.error("Required field missing: model");
      return;
    }

    onAdd(formattedData as Omit<StudioInventoryItem, "id">);
    onClose();
  };

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(e as unknown as React.FormEvent);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);

    for (const file of files) {
      try {
        const uploadId = uuidv4();
        const newProgress: FileUploadProgress = {
          id: uploadId,
          fileName: file.name,
          status: "uploading",
          progress: 0,
          currentStep: "Uploading file",
        };

        setUploadProgress((prev) => [...prev, newProgress]);

        console.log(`Starting upload for ${file.name}`);

        // Use the fixed uploadToCloudflare function
        const result = await uploadToCloudflare(file);
        console.log(`Upload successful for ${file.name}:`, result);

        // Update progress with complete status
        const completeProgress: FileUploadProgress = {
          ...newProgress,
          status: "complete",
          progress: 100,
          imageUrl: result.url,
        };

        handleImageProgress(completeProgress);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);

        // Update progress with error status
        const errorProgress: FileUploadProgress = {
          id: uuidv4(),
          fileName: file.name,
          status: "error",
          progress: 0,
          error:
            error instanceof Error ? error.message : "Failed to upload file",
        };

        handleImageProgress(errorProgress);
      }
    }
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Enter the details for the new inventory item
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-8 h-10 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
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
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        })
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
                          condition: value as StudioInventoryItem["condition"],
                        })
                      }
                      required
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
                          <SelectItem key={location.id} value={location.id}>
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
                          containerId: value === "none" ? undefined : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select container" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {containers.map((container) => (
                          <SelectItem key={container.id} value={container.id}>
                            {container.name} (#
                            {container.containerNumber}) - {container.type}
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
            </TabsContent>

            <TabsContent value="financial">
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
            </TabsContent>

            <TabsContent value="technical">
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
                        Enter dimensions in format: W: 10in, H: 5in, D: 3in,
                        Weight: 2lb
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
            </TabsContent>

            <TabsContent value="maintenance">
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
            </TabsContent>

            <TabsContent value="images">
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
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddButtonClick}>
              Add Item
            </Button>
          </DialogFooter>
        </form>

        <UploadProgressDialog
          isOpen={isUploading}
          onClose={() => setIsUploading(false)}
          uploadProgress={uploadProgress}
        />
      </DialogContent>
    </Dialog>
  );
}
