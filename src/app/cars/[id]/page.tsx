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

interface Engine {
  type: string;
  displacement?: MeasurementValue;
  power?: Power;
  torque?: Torque;
  features?: string[];
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

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
  mileage: MeasurementValue;
  color: string | null;
  dealer: string | null;
  description: string | null;
  price: number | string | null;
  horsepower: number;
  condition: string | null;
  location: string;
  type?: string;
  vin?: string;
  images: {
    id: string;
    url: string;
    filename: string;
    metadata: ImageMetadata;
    variants: ImageVariants;
    createdAt: string;
    updatedAt: string;
  }[];
  owner_id?: string;
  engine?: Engine;
  client?: string;
  clientInfo?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    role?: string;
    [key: string]: string | undefined;
  } | null;
  createdAt: string;
  updatedAt: string;
  status?: "available" | "sold" | "pending";
  dimensions?: Dimensions;
  fuel_capacity?: MeasurementValue;
  interior_features?: InteriorFeatures;
  interior_color?: string;
  performance?: Performance;
  transmission?: Transmission;
  weight?: Weight;
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
      Car,
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

export default function CarPage() {
  const { id } = useParams() as { id: string };
  const [car, setCar] = useState<Car | null>(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSpecsEditMode, setIsSpecsEditMode] = useState(false);
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
    field: keyof EditableSpecs,
    value: string | number | { [key: string]: number | string | null },
    nestedField?: string
  ): void => {
    console.error("[DEBUG] handleInputChange called with:", {
      field,
      value,
      nestedField,
    });
    let newValue:
      | string
      | number
      | { [key: string]: number | string | null }
      | null = value;

    // Handle number fields
    if (
      field === "year" ||
      field === "mileage" ||
      field === "price" ||
      (field === "interior_features" && nestedField === "seats")
    ) {
      newValue = value
        ? parseInt(value.toString())
        : field === "price"
        ? null
        : 0;
    }

    // Update the editedSpecs state
    setEditedSpecs((prev: EditableSpecs) => {
      // Handle nested fields
      if (nestedField && isNestedField(field)) {
        const existingFieldValue = (prev[field] || {}) as Record<
          string,
          unknown
        >;
        const newSpecs = {
          ...prev,
          [field]: {
            ...existingFieldValue,
            [nestedField]: newValue,
          },
        };
        console.error("[DEBUG] Updated editedSpecs (nested):", newSpecs);
        return newSpecs;
      }

      // Handle top-level fields
      const newSpecs = {
        ...prev,
        [field]: newValue,
      };
      console.error("[DEBUG] Updated editedSpecs (top-level):", newSpecs);
      return newSpecs;
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
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/cars/${id}`);
        const data = await response.json();
        console.log("Fetched car data:", JSON.stringify(data, null, 2));
        setCar(data);

        // Fetch documents
        const docsResponse = await fetch(`/api/cars/${id}/documents`);
        const docsData = await docsResponse.json();
        setDocuments(docsData);
      } catch (error) {
        console.error("Error fetching car data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

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

  const handleSpecsEdit = async () => {
    if (!car || !isSpecsEditMode) return;

    try {
      console.error("[DEBUG] Saving specs - editedSpecs:", editedSpecs);
      const response = await fetch(`/api/cars/${car._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedSpecs),
      });

      const data = await response.json();
      console.error("[DEBUG] PATCH response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to update specifications");
      }

      // Fetch the updated car data to ensure we have the complete and correct state
      const updatedCarResponse = await fetch(`/api/cars/${car._id}`);
      if (!updatedCarResponse.ok) {
        throw new Error("Failed to fetch updated car data");
      }
      const updatedCar = await updatedCarResponse.json();
      console.error("[DEBUG] GET response after update:", updatedCar);
      setCar(updatedCar);

      // Reset edit mode and clear edited specs
      setIsSpecsEditMode(false);
      setEditedSpecs({});
    } catch (error) {
      console.error("Error updating specifications:", error);
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
    <div className="min-h-screen bg-white dark:bg-[#111111] flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* Header */}
        <div className="mb-4">
          <PageTitle title={`${car.year} ${car.make} ${car.model}`}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </PageTitle>
        </div>

        {/* Replace both the context input and image gallery with the new component */}
        <div className="mb-6">
          <ImageUploadWithContext
            images={car.images}
            isEditMode={isEditMode}
            onRemoveImage={handleRemoveImage}
            onImagesChange={handleImageUpload}
            uploading={uploadingImages}
            uploadProgress={uploadProgress}
            setUploadProgress={setUploadProgress}
            showMetadata={true}
            title={`${car.year} ${car.make} ${car.model}`}
            onContextChange={setAdditionalContext}
            carId={id}
          />
        </div>

        {/* Add CaptionGenerator after the image gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <CaptionGenerator
            carDetails={{
              _id: car._id,
              year: car.year,
              make: car.make,
              model: car.model,
              color: car.color,
              engine: car.engine,
              mileage: car.mileage
                ? { value: car.mileage.value, unit: car.mileage.unit }
                : undefined,
              type: car.type,
              client: car.client,
              description: car.description,
            }}
          />
          <BaTListingGenerator carDetails={car} />
        </div>

        {/* Vehicle Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div>
            <Specifications
              car={car}
              isEditMode={isSpecsEditMode}
              onEdit={() => setIsSpecsEditMode(true)}
              onSave={handleSpecsEdit}
              onCancel={() => {
                setIsSpecsEditMode(false);
                setEditedSpecs({});
              }}
              onEnrich={handleEnrichData}
              isEnriching={isEnriching}
              editedSpecs={editedSpecs}
              onInputChange={handleInputChange}
              onMeasurementChange={handleMeasurementChange}
            />
          </div>
        </div>

        {/* Car Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {car.description && (
              <section className="space-y-4">
                <h2 className="text-sm uppercase tracking-wide font-medium text-gray-600 dark:text-gray-400">
                  Description
                </h2>
                <div className="bg-white dark:bg-black/25 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                  <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {car.description}
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Service History */}
        <div className="mt-8">
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm uppercase tracking-wide font-medium text-gray-600 dark:text-gray-400">
                Service History
              </h2>
              <button
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                aria-label="Add document"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white dark:bg-black/25 border border-gray-200 dark:border-gray-800 rounded-lg">
              <DocumentsClient carId={id} initialDocuments={documents} />
            </div>
          </section>
        </div>

        {/* Add this section after the existing tabs */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Research</h2>
          <ResearchFiles carId={id} />
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
