"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import DocumentsClient from "@/app/documents/DocumentsClient";
import { Loader2, Plus, Sparkles, Pencil, Trash2 } from "lucide-react";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { getUnitsForType } from "@/constants/units";
import { PageTitle } from "@/components/ui/PageTitle";
import Footer from "@/components/layout/footer";
import { CarPageSkeleton } from "@/components/ui/CarPageSkeleton";
import { EnrichmentProgress } from "@/components/ui/EnrichmentProgress";
import ImageUploadWithContext from "@/components/ImageUploadWithContext";
import CaptionGenerator from "@/components/CaptionGenerator";
import BaTListingGenerator from "@/components/BaTListingGenerator";
import { toast } from "react-hot-toast";
import ResearchFiles from "@/components/ResearchFiles";
import Specifications from "@/components/cars/Specifications";
import { ArticleGenerator } from "@/components/cars/ArticleGenerator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageGalleryEnhanced } from "@/components/cars/ImageGalleryEnhanced";
import type { Car as BaseCar, CarImage, Engine } from "@/types/car";

interface MeasurementValue {
  value: number | null;
  unit: string;
}

interface Power {
  hp: number;
  kW: number;
  ps: number;
}

interface Torque {
  "lb-ft": number;
  Nm: number;
}

interface ApiCarResponse {
  _id?: string;
  make: string;
  model: string;
  year: number;
  price: string | number;
  mileage?: {
    value: number;
    unit: string;
  };
  color?: string;
  interior_color?: string;
  vin?: string;
  status?: "available" | "sold" | "pending";
  condition?: string;
  location?: string;
  description?: string;
  type?: string;
  engine?: {
    type?: string;
    displacement?: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
      kW: number;
      ps: number;
    };
    torque?: {
      "lb-ft": number;
      Nm: number;
    };
    features?: string[];
    configuration?: string;
    cylinders?: number;
    fuelType?: string;
    manufacturer?: string;
  };
  images?: CarImage[];
  client?: string;
  clientInfo?: any;
  manufacturing?: any;
  dimensions?: any;
  safety?: any;
  doors?: number;
  interior_features?: any;
  transmission?: {
    type: string;
  };
  performance?: any;
  aiAnalysis?: any;
}

interface ExtendedCar extends BaseCar {
  images?: CarImage[];
  clientInfo?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    company?: string;
    role?: string;
  } | null;
  interior_features?: {
    seats?: number;
    upholstery?: string;
  };
  performance?: {
    "0_to_60_mph"?: MeasurementValue;
    top_speed?: MeasurementValue;
  };
}

interface Dimensions {
  length: MeasurementValue;
  width: MeasurementValue;
  height: MeasurementValue;
  wheelbase: MeasurementValue;
}

interface InteriorFeatures {
  seats: number;
  upholstery?: string;
}

interface Performance {
  "0_to_60_mph": MeasurementValue;
  top_speed: MeasurementValue;
}

interface Transmission {
  type: string;
}

interface Weight {
  curb_weight: MeasurementValue;
}

interface ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
  aiAnalysis?: {
    angle?: string;
    description?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
  };
}

interface ImageVariants {
  [key: string]: string;
}

interface UploadedImageData {
  id: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  variants: ImageVariants;
  createdAt: string;
  updatedAt: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
}

interface EditableSpecs
  extends Partial<
    Omit<
      ExtendedCar,
      | "dimensions"
      | "performance"
      | "weight"
      | "transmission"
      | "interior_features"
    >
  > {
  dimensions?: Partial<Dimensions>;
  performance?: Partial<Performance>;
  weight?: Partial<Weight>;
  transmission?: Partial<Transmission>;
  interior_features?: Partial<InteriorFeatures>;
}

interface BaTCarDetails {
  _id: string;
  year: number;
  make: string;
  model: string;
  color?: string;
  mileage?: {
    value: number;
    unit: string;
  };
  engine?: {
    type?: string;
    displacement?: {
      value: number;
      unit: string;
    };
    power?: {
      hp?: number;
    };
  };
  transmission: {
    type: string;
  };
  vin?: string;
  condition?: string;
  interior_color?: string;
  interior_features?: {
    seats: number;
    upholstery?: string;
  };
  description?: string;
}

interface CarFormData {
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: MeasurementValue;
  color: string;
  interior_color: string;
  vin: string;
  status: "available" | "sold" | "pending";
  condition: string;
  location: string;
  description: string;
  type: string;
  client?: string;
  engine: Engine;
  transmission: {
    type: string;
  };
  // ... other fields from BaseCar
}

export default function CarPage() {
  const { id } = useParams() as { id: string };
  const [car, setCar] = useState<ExtendedCar | null>(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSpecsEditMode, setIsSpecsEditMode] = useState(false);
  const [isSpecsSaving, setIsSpecsSaving] = useState(false);
  const [editedSpecs, setEditedSpecs] = useState<EditableSpecs>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [showEnrichProgress, setShowEnrichProgress] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{
    step: number;
    currentStep: string;
    status: "pending" | "processing" | "complete" | "error";
    error?: string;
    details?: {
      searchTermsGenerated?: number;
      additionalSearchesCompleted?: number;
      fieldsUpdated?: number;
      protectedFieldsPreserved?: string[];
    };
  }>({
    step: 0,
    currentStep: "",
    status: "pending",
  });
  const [additionalContext, setAdditionalContext] = useState("");
  const router = useRouter();

  type NestedFields =
    | "engine"
    | "dimensions"
    | "interior_features"
    | "performance"
    | "transmission"
    | "weight";

  // Helper function to handle input values
  const getInputValue = (
    value: string | number | MeasurementValue | null | undefined
  ): string => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number") return value.toString();
    if (typeof value === "string") return value;
    if (value.value === null) return "";
    return value.value.toString();
  };

  // Helper function to handle number input values
  const getNumberInputValue = (
    value: string | number | MeasurementValue | null | undefined
  ): string => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number") return value.toString();
    if (typeof value === "string" && !isNaN(Number(value))) return value;
    if (typeof value === "object" && value.value !== null)
      return value.value.toString();
    return "";
  };

  // Helper function to format structured measurement values
  const formatMeasurement = (
    measurement: MeasurementValue | string | undefined
  ): string => {
    if (!measurement) return "N/A";
    if (typeof measurement === "string") return measurement;
    if (measurement.value === null) return "N/A";
    return `${measurement.value} ${measurement.unit}`;
  };

  // Helper function to display mileage
  const formatMileage = (mileage: MeasurementValue | undefined): string => {
    if (!mileage || mileage.value === null || mileage.value === undefined)
      return "0";
    return (
      mileage.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
      " " +
      (mileage.unit || "")
    );
  };

  // Type guard for nested fields
  const isNestedField = (field: keyof EditableSpecs): field is NestedFields => {
    return [
      "engine",
      "dimensions",
      "interior_features",
      "performance",
      "transmission",
      "weight",
    ].includes(field as string);
  };

  // Helper function to handle input changes
  const handleInputChange = (
    field: string,
    value: any,
    nestedField?: string
  ): void => {
    setEditedSpecs((prev) => {
      if (nestedField) {
        return {
          ...prev,
          [field]: {
            ...prev[field],
            [nestedField]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  // Helper function to handle measurement input changes
  const handleMeasurementChange = (
    field: keyof EditableSpecs | string,
    value: MeasurementValue,
    nestedField?: string
  ): void => {
    setEditedSpecs((prev) => {
      // Handle nested paths like "engine.displacement"
      if (field.includes(".")) {
        const [parentField, childField] = field.split(".");
        const parentValue = (prev[parentField as keyof EditableSpecs] ||
          {}) as Record<string, unknown>;
        return {
          ...prev,
          [parentField]: {
            ...parentValue,
            [childField]: value,
          },
        };
      }

      // Handle nested fields with explicit nestedField parameter
      if (nestedField && isNestedField(field as keyof EditableSpecs)) {
        const existingFieldValue = (prev[field as keyof EditableSpecs] ||
          {}) as Record<string, unknown>;
        return {
          ...prev,
          [field]: {
            ...existingFieldValue,
            [nestedField]: value,
          },
        };
      }

      // Handle top-level fields
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  // Add helper function to handle power change
  const handlePowerChange = (value: MeasurementValue) => {
    // Convert hp to kW and ps
    const hp = value.value || 0;
    const kW = Math.round(hp * 0.7457);
    const ps = Math.round(hp * 1.014);

    setEditedSpecs((prev) => ({
      ...prev,
      engine: {
        ...prev.engine,
        power: { hp, kW, ps },
      },
    }));
  };

  // Add helper function to handle torque change
  const handleTorqueChange = (value: MeasurementValue) => {
    // Convert lb-ft to Nm
    const lbFt = value.value || 0;
    const Nm = Math.round(lbFt * 1.3558);

    setEditedSpecs((prev) => ({
      ...prev,
      engine: {
        ...prev.engine,
        torque: { "lb-ft": lbFt, Nm },
      },
    }));
  };

  // Add escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditMode) {
        setIsEditMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode]);

  // Add effect to refresh car data when entering edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const refreshCarData = async () => {
        try {
          const response = await fetch(`/api/cars/${id}`);
          if (!response.ok) throw new Error("Failed to fetch car data");
          const carData = await response.json();
          setCar(carData);
        } catch (error) {
          console.error("Error refreshing car data:", error);
        }
      };
      refreshCarData();
    }
  }, [isEditMode, id]);

  useEffect(() => {
    const fetchCar = async () => {
      try {
        const response = await fetch(`/api/cars/${id}`);
        const apiData: ApiCarResponse = await response.json();

        // Transform the API response to match our UI requirements
        const carData: ExtendedCar = {
          _id: apiData._id || id,
          make: apiData.make || "",
          model: apiData.model || "",
          year: apiData.year || new Date().getFullYear(),
          price:
            typeof apiData.price === "string"
              ? parseFloat(apiData.price)
              : apiData.price || 0,
          mileage: apiData.mileage || { value: 0, unit: "mi" },
          color: apiData.color || "",
          interior_color: apiData.interior_color || "",
          vin: apiData.vin || "",
          status: apiData.status || "available",
          condition: apiData.condition || "",
          location: apiData.location || "",
          description: apiData.description || "",
          type: apiData.type || "",
          client: apiData.client || "",
          clientInfo: apiData.clientInfo || null,
          // Preserve engine data exactly as received
          engine: {
            type: apiData.engine?.type || "Unknown",
            displacement: apiData.engine?.displacement || {
              value: 0,
              unit: "L",
            },
            power: apiData.engine?.power || { hp: 0, kW: 0, ps: 0 },
            torque: apiData.engine?.torque || { "lb-ft": 0, Nm: 0 },
            features: apiData.engine?.features || [],
            configuration: apiData.engine?.configuration,
            cylinders: apiData.engine?.cylinders,
            fuelType: apiData.engine?.fuelType,
            manufacturer: apiData.engine?.manufacturer,
          },
          // Preserve manufacturing data
          manufacturing: apiData.manufacturing || {},
          // Preserve dimensions data
          dimensions: apiData.dimensions || {},
          // Preserve safety data
          safety: apiData.safety || {},
          // Preserve doors
          doors: apiData.doors,
          // Preserve interior features
          interior_features: apiData.interior_features || {
            seats: 0,
            upholstery: "",
          },
          // Preserve transmission
          transmission: apiData.transmission || { type: "" },
          // Preserve performance data
          performance: apiData.performance || {
            "0_to_60_mph": null,
            top_speed: null,
          },
          // Preserve AI analysis
          aiAnalysis: apiData.aiAnalysis || {},
          // Images
          imageIds: apiData.images?.map((img) => img.id) || [],
          images: apiData.images || [],
        };

        setCar(carData);
        setLoading(false);

        // Fetch documents
        const docsResponse = await fetch(`/api/cars/${id}/documents`);
        const docsData = await docsResponse.json();
        setDocuments(docsData);
      } catch (error) {
        console.error("Error fetching car:", error);
        setLoading(false);
      }
    };

    fetchCar();
  }, [id]);

  // Helper function to convert ExtendedCar to CarFormData
  const toCarFormData = (car: ExtendedCar): CarFormData => {
    return {
      ...car,
      price: typeof car.price === "string" ? parseFloat(car.price) : car.price,
      mileage: car.mileage,
      color: car.color,
      interior_color: car.interior_color,
      vin: car.vin,
      status: car.status,
      condition: car.condition,
      location: car.location,
      description: car.description,
      type: car.type,
      client: car.client,
      engine: car.engine,
      transmission: {
        type: car.transmission?.type || "N/A",
      },
      // Add any other necessary transformations
    };
  };

  // Helper function to convert CarFormData back to ExtendedCar format
  const fromCarFormData = (
    formData: Partial<CarFormData>
  ): Partial<ExtendedCar> => {
    return {
      ...formData,
      price: formData.price ? Number(formData.price) : undefined,
      mileage: formData.mileage,
      color: formData.color,
      interior_color: formData.interior_color,
      vin: formData.vin,
      status: formData.status,
      condition: formData.condition,
      location: formData.location,
      description: formData.description,
      type: formData.type,
      client: formData.client,
      engine: formData.engine,
      transmission: {
        type: formData.transmission?.type || "N/A",
      },
      // Add any other necessary transformations
    };
  };

  // Helper function to convert Car type to BaTCarDetails type for BaTListingGenerator
  const toBaTCarDetails = (car: ExtendedCar): BaTCarDetails => {
    return {
      _id: car._id,
      year: car.year,
      make: car.make,
      model: car.model,
      color: car.color,
      mileage: car.mileage,
      engine: {
        type: car.engine?.type,
        displacement: car.engine?.displacement,
        power: {
          hp: car.engine?.power?.hp,
        },
      },
      transmission: {
        type: car.transmission?.type || "Unknown", // Ensure type is always provided
      },
      vin: car.vin,
      condition: car.condition,
      interior_color: car.interior_color,
      description: car.description,
    };
  };

  const handleImageUpload = async (files: FileList) => {
    if (!car) return;

    try {
      // Initialize progress tracking immediately
      const fileArray = Array.from(files);
      setUploadProgress(
        fileArray.map((file) => ({
          fileName: file.name,
          progress: 0,
          status: "pending" as const,
          currentStep: "Preparing upload...",
        }))
      );
      setUploadingImages(true);

      // Create upload promises for all files
      const uploadPromises = fileArray.map((file, i) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("carId", id);
        formData.append(
          "vehicleInfo",
          JSON.stringify({
            year: car.year,
            make: car.make,
            model: car.model,
            type: car.type,
            color: car.color,
            description: car.description,
            condition: car.condition,
            mileage: car.mileage,
            engine: car.engine,
            additionalContext: additionalContext,
          })
        );

        // Update status to uploading
        setUploadProgress((prev) =>
          prev.map((p, index) =>
            index === i
              ? {
                  ...p,
                  status: "uploading",
                  currentStep: "Starting upload...",
                }
              : p
          )
        );

        return new Promise<{
          index: number;
          imageData: UploadedImageData;
        }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded * 100) / event.total);
              setUploadProgress((prev) =>
                prev.map((p, idx) =>
                  idx === i
                    ? {
                        ...p,
                        progress,
                        currentStep: `Uploading: ${progress}%`,
                      }
                    : p
                )
              );
            }
          });

          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                // Update status to analyzing
                setUploadProgress((prev) =>
                  prev.map((p, idx) =>
                    idx === i
                      ? {
                          ...p,
                          progress: 100,
                          status: "analyzing",
                          currentStep: "Analyzing image with AI...",
                        }
                      : p
                  )
                );

                const uploadResponse = JSON.parse(xhr.responseText);
                const imageData = {
                  id: uploadResponse.imageId,
                  url: uploadResponse.imageUrl,
                  filename: file.name,
                  metadata: {
                    ...uploadResponse.metadata,
                    angle: uploadResponse.metadata?.aiAnalysis?.angle || "",
                    description:
                      uploadResponse.metadata?.aiAnalysis?.description || "",
                    movement:
                      uploadResponse.metadata?.aiAnalysis?.movement || "",
                    tod: uploadResponse.metadata?.aiAnalysis?.tod || "",
                    view: uploadResponse.metadata?.aiAnalysis?.view || "",
                    side: uploadResponse.metadata?.aiAnalysis?.side || "",
                  },
                  variants: {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                // Update status to complete for this image
                setUploadProgress((prev) =>
                  prev.map((p, idx) =>
                    idx === i
                      ? {
                          ...p,
                          status: "complete",
                          currentStep: "Upload complete!",
                        }
                      : p
                  )
                );

                resolve({ index: i, imageData });
              } catch (error) {
                reject(error);
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.open("POST", "/api/cloudflare/images");
          xhr.send(formData);
        });
      });

      // Process uploads in parallel with a maximum of 3 concurrent uploads
      const batchSize = 3;
      const results = [];
      for (let i = 0; i < uploadPromises.length; i += batchSize) {
        const batch = uploadPromises.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch);
        results.push(...batchResults);
      }

      // Collect successful uploads
      const successfulUploads = results
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            index: number;
            imageData: UploadedImageData;
          }> => result.status === "fulfilled"
        )
        .map((result) => result.value.imageData);

      if (successfulUploads.length > 0) {
        try {
          // Fetch latest car data once for the batch
          const carResponse = await fetch(`/api/cars/${id}`);
          if (!carResponse.ok) {
            throw new Error("Failed to fetch latest car data");
          }
          const latestCarData = await carResponse.json();

          // Combine existing images with new uploads
          const allImages = [...latestCarData.images];

          // Add new images, ensuring no duplicates by ID
          successfulUploads.forEach((newImage) => {
            if (!allImages.some((existing) => existing.id === newImage.id)) {
              allImages.push(newImage);
            }
          });

          // Update the backend with all images
          const dbResponse = await fetch(`/api/cars/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              images: allImages,
            }),
          });

          if (!dbResponse.ok) {
            throw new Error("Failed to update car images in database");
          }

          // Verify the update by fetching the latest data
          const verifyResponse = await fetch(`/api/cars/${id}`);
          if (!verifyResponse.ok) {
            throw new Error("Failed to verify image update");
          }
          const verifiedData = await verifyResponse.json();

          // Update UI with verified data
          setCar(verifiedData);
        } catch (error) {
          console.error("Error updating images:", error);
          throw error;
        }
      }

      // Update error status for failed uploads
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          setUploadProgress((prev) =>
            prev.map((p, i) =>
              i === index
                ? {
                    ...p,
                    status: "error",
                    currentStep: "Upload failed",
                    error: result.reason.message,
                  }
                : p
            )
          );
        }
      });
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      // Only clear states if all files are complete or errored
      const allComplete = uploadProgress.every(
        (p) => p.status === "complete" || p.status === "error"
      );
      if (allComplete) {
        // Wait a moment to show completion status before clearing
        setTimeout(() => {
          setUploadingImages(false);
          setUploadProgress([]);
        }, 2000);
      }
    }
  };

  const handleRemoveImage = async (
    indices: number[],
    deleteFromStorage: boolean = false
  ) => {
    if (!car) return;

    try {
      // First remove from car's state
      const indicesToRemove = new Set(indices);
      const imagesToDelete = car.images.filter((_, i) =>
        indicesToRemove.has(i)
      );
      const newImages = car.images.filter((_, i) => !indicesToRemove.has(i));

      // Delete each image from the API
      for (const image of imagesToDelete) {
        const response = await fetch(`/api/cars/${id}/images`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: image.url,
            deleteFromStorage,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to delete image:", error);
          throw new Error("Failed to delete image");
        }
      }

      // Update the database with the new images array
      const updateResponse = await fetch(`/api/cars/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: newImages }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update car images");
      }

      // Update local state
      setCar({ ...car, images: newImages });
    } catch (error) {
      console.error("Error removing images:", error);
      toast.error("Failed to remove images");
    }
  };

  const handleEnrichData = async () => {
    if (!car) return;

    setIsEnriching(true);
    setShowEnrichProgress(true);
    setEnrichProgress({
      step: 1,
      currentStep: "Initial Search",
      status: "processing",
    });

    try {
      // Start enrichment process
      const response = await fetch(`/api/cars/${car._id}/enrich`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to enrich car data");
      }

      const data = await response.json();
      console.log("Enrichment response:", data);

      if (data.success && data.data) {
        // Update progress based on backend response
        if (data.progress) {
          setEnrichProgress(data.progress);
        } else {
          setEnrichProgress({
            step: 6,
            currentStep: "Complete",
            status: "complete",
          });
        }

        // Add a small delay to ensure database write is complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Fetch fresh data after the delay
        const freshDataResponse = await fetch(`/api/cars/${car._id}`);
        if (!freshDataResponse.ok) {
          throw new Error("Failed to fetch updated car data");
        }
        const freshData = await freshDataResponse.json();
        console.log("Fresh car data:", freshData);

        // Only update if we have valid data
        if (freshData._id) {
          // Force a re-render by creating a new object
          setCar({ ...freshData });
          toast.success("Car data enriched successfully");
        } else {
          throw new Error("Invalid car data received");
        }
      } else {
        // Handle error progress from backend
        const errorMessage = data.error || "Failed to enrich car data";
        setEnrichProgress({
          step: 0,
          currentStep: "",
          status: "error",
          error: errorMessage,
        });
        toast.error(errorMessage);
        console.error("Failed to enrich car data:", errorMessage);
      }
    } catch (error) {
      // Handle error progress
      const errorMessage =
        error instanceof Error ? error.message : "Failed to enrich car data";
      setEnrichProgress({
        step: 0,
        currentStep: "",
        status: "error",
        error: errorMessage,
      });
      toast.error(errorMessage);
      console.error("Error enriching car data:", error);
    } finally {
      // Keep isEnriching true for a moment to show completion state
      setTimeout(() => {
        setIsEnriching(false);
        setShowEnrichProgress(false);
        setEnrichProgress({
          step: 0,
          currentStep: "",
          status: "pending",
        });
      }, 2000);
    }
  };

  const handleSpecsEdit = async (editedSpecs: Partial<CarFormData>) => {
    if (!car || !isSpecsEditMode) return;

    try {
      setIsSpecsSaving(true);
      const transformedSpecs = fromCarFormData(editedSpecs);

      const response = await fetch(`/api/cars/${car._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transformedSpecs),
      });

      if (!response.ok) {
        throw new Error("Failed to update car specifications");
      }

      const updatedCar = await response.json();
      setCar(updatedCar);
      setIsSpecsEditMode(false);
      toast.success("Car specifications updated successfully");
    } catch (error) {
      console.error("Error updating car specifications:", error);
      toast.error("Failed to update car specifications");
    } finally {
      setIsSpecsSaving(false);
    }
  };

  // Add helper function to format power values
  const formatPower = (power?: Power): string => {
    if (!power) return "N/A";
    return `${power.hp} hp / ${power.kW} kW / ${power.ps} ps`;
  };

  // Add helper function to format torque values
  const formatTorque = (torque?: Torque): string => {
    if (!torque) return "N/A";
    return `${torque["lb-ft"]} lb-ft / ${torque.Nm} Nm`;
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this car? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/cars/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete car");
      }

      router.push("/cars");
    } catch (error) {
      console.error("Error deleting car:", error);
      alert("Failed to delete car. Please try again.");
    }
  };

  if (loading) {
    return <CarPageSkeleton />;
  }

  if (!car) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Car not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageTitle
            title={`${car.year} ${car.make} ${car.model}`}
            className="mb-6"
          />

          <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="gallery">Image Gallery</TabsTrigger>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
              <TabsTrigger value="bat">BaT Listing</TabsTrigger>
              <TabsTrigger value="captions">Social Media</TabsTrigger>
              <TabsTrigger value="service">Service History</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
              <TabsTrigger value="article">Article</TabsTrigger>
            </TabsList>

            <TabsContent value="gallery">
              {car.images && car.images.length > 0 ? (
                <ImageGalleryEnhanced images={car.images} />
              ) : (
                <ImageUploadWithContext
                  images={car.images || []}
                  isEditMode={isEditMode}
                  onRemoveImage={handleRemoveImage}
                  onImagesChange={handleImageUpload}
                  uploading={uploadingImages}
                  uploadProgress={uploadProgress}
                  setUploadProgress={setUploadProgress}
                  showMetadata={true}
                  showFilters={false}
                  title={`${car.year} ${car.make} ${car.model}`}
                  onContextChange={setAdditionalContext}
                  carId={car._id}
                />
              )}
            </TabsContent>

            <TabsContent value="specs">
              <Specifications
                car={toCarFormData(car)}
                isEditMode={isSpecsEditMode}
                onEdit={() => setIsSpecsEditMode(!isSpecsEditMode)}
                onSave={handleSpecsEdit}
                editedSpecs={editedSpecs}
                onInputChange={(field, value, nestedField) =>
                  handleInputChange(field, value, nestedField)
                }
                onMeasurementChange={handleMeasurementChange}
                onPowerChange={handlePowerChange}
                onTorqueChange={handleTorqueChange}
                onEnrich={handleEnrichData}
                isEnriching={isEnriching}
              />
            </TabsContent>

            <TabsContent value="bat">
              <BaTListingGenerator carDetails={toBaTCarDetails(car)} />
            </TabsContent>

            <TabsContent value="captions">
              <CaptionGenerator
                carDetails={{
                  _id: car._id,
                  year: car.year,
                  make: car.make,
                  model: car.model,
                  color: car.color,
                  engine: car.engine,
                  mileage: car.mileage,
                  type: car.type,
                  client: car.client,
                  description: car.description || "",
                }}
              />
            </TabsContent>

            <TabsContent value="service">
              <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Service History</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Service history feature coming soon...
                </p>
              </div>
            </TabsContent>

            <TabsContent value="research">
              <ResearchFiles carId={car._id} />
            </TabsContent>

            <TabsContent value="article">
              <ArticleGenerator car={car} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      <EnrichmentProgress
        isVisible={showEnrichProgress}
        step={enrichProgress.step}
        _currentStep={enrichProgress.currentStep}
        status={enrichProgress.status}
        error={enrichProgress.error}
        details={enrichProgress.details}
        onClose={() => setShowEnrichProgress(false)}
      />
    </div>
  );
}
