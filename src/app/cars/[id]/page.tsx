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
        return {
          ...prev,
          [field]: {
            ...existingFieldValue,
            [nestedField]: newValue,
          },
        };
      }

      // Handle top-level fields
      return {
        ...prev,
        [field]: newValue,
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
    const fetchData = async () => {
      try {
        // First fetch the car data
        const carResponse = await fetch(`/api/cars/${id}`);
        if (!carResponse.ok) throw new Error("Failed to fetch car");
        const carData = await carResponse.json();
        // No need to format image URLs anymore as they're now objects
        setCar(carData);

        // Then try to fetch documents if available
        try {
          const documentsResponse = await fetch(`/api/cars/${id}/documents`);
          if (documentsResponse.ok) {
            const documentsData = await documentsResponse.json();
            setDocuments(documentsData);
          }
        } catch (docError) {
          console.log(
            "No documents found or error fetching documents:",
            docError
          );
          setDocuments([]);
        }
      } catch (error) {
        console.error("Error fetching car data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      const response = await fetch(`/api/cars/${car._id}/enrich`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to enrich car data");
      }

      const data = await response.json();

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

        // Only update if we have valid data
        if (freshData._id && freshData.images) {
          setCar(freshData);
        }
      } else {
        // Handle error progress from backend
        if (data.progress) {
          setEnrichProgress(data.progress);
        } else {
          setEnrichProgress({
            step: 0,
            currentStep: "",
            status: "error",
            error: data.error || "Failed to enrich car data",
          });
        }
        console.error("Failed to enrich car data:", data.error);
      }
    } catch (error) {
      // Handle error progress
      setEnrichProgress({
        step: 0,
        currentStep: "",
        status: "error",
        error:
          error instanceof Error ? error.message : "Failed to enrich car data",
      });
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
      const response = await fetch(`/api/cars/${car._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedSpecs),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update specifications");
      }

      // Fetch the updated car data to ensure we have the complete and correct state
      const updatedCarResponse = await fetch(`/api/cars/${car._id}`);
      if (!updatedCarResponse.ok) {
        throw new Error("Failed to fetch updated car data");
      }
      const updatedCar = await updatedCarResponse.json();
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
                Specifications
              </h2>
              <div className="flex items-center gap-2">
                {isSpecsEditMode ? (
                  <>
                    <button
                      onClick={handleSpecsEdit}
                      className="px-3 py-1 text-sm text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 border border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 rounded-md transition-colors flex items-center gap-1"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsSpecsEditMode(false);
                        setEditedSpecs({});
                      }}
                      className="px-3 py-1 text-sm text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 rounded-md transition-colors flex items-center gap-1"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsSpecsEditMode(true)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      aria-label="Edit specifications"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleEnrichData}
                      disabled={isEnriching}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-50 relative"
                      aria-label="Enrich data"
                    >
                      {isEnriching ? (
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {enrichProgress.status === "processing" && (
                            <div className="absolute left-full ml-2 whitespace-nowrap bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-xs">
                              {enrichProgress.currentStep}
                              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-[#111111]" />
                            </div>
                          )}
                          {enrichProgress.status === "error" && (
                            <div className="absolute left-full ml-2 whitespace-nowrap bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-2 py-1 text-xs text-red-600 dark:text-red-400">
                              {enrichProgress.error}
                              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-red-50 dark:border-r-red-900/20" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
              {/* Basic Info */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Year
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isSpecsEditMode ? (
                    <input
                      type="number"
                      value={getNumberInputValue(editedSpecs.year ?? car.year)}
                      onChange={(e) =>
                        handleInputChange("year", e.target.value)
                      }
                      className="w-24 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                    />
                  ) : (
                    car.year
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Make
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(editedSpecs.make ?? car.make)}
                      onChange={(e) =>
                        handleInputChange("make", e.target.value)
                      }
                      className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                    />
                  ) : (
                    car.make
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Model
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(editedSpecs.model ?? car.model)}
                      onChange={(e) =>
                        handleInputChange("model", e.target.value)
                      }
                      className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                    />
                  ) : (
                    car.model
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Color
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(editedSpecs.color ?? car.color)}
                      onChange={(e) =>
                        handleInputChange("color", e.target.value)
                      }
                      className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                    />
                  ) : (
                    car.color || "N/A"
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Mileage
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isSpecsEditMode ? (
                    <MeasurementInputWithUnit
                      value={
                        editedSpecs.mileage ?? {
                          value: car.mileage?.value ?? null,
                          unit:
                            car.mileage?.unit ?? getUnitsForType("MILEAGE")[0],
                        }
                      }
                      onChange={(value) =>
                        handleMeasurementChange("mileage", value)
                      }
                      availableUnits={getUnitsForType("MILEAGE")}
                      className="justify-end"
                    />
                  ) : (
                    formatMileage(car.mileage)
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  VIN
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white font-mono pr-3">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(editedSpecs.vin ?? car.vin)}
                      onChange={(e) => handleInputChange("vin", e.target.value)}
                      className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                    />
                  ) : (
                    car.vin || "N/A"
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Client
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {car.clientInfo?.name || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Location
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(
                        editedSpecs.location ?? car.location
                      )}
                      onChange={(e) =>
                        handleInputChange("location", e.target.value)
                      }
                      className="w-40 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                    />
                  ) : (
                    car.location || "N/A"
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Price
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                  {isSpecsEditMode ? (
                    <input
                      type="number"
                      value={getNumberInputValue(
                        editedSpecs.price ?? car.price
                      )}
                      onChange={(e) =>
                        handleInputChange("price", e.target.value)
                      }
                      className="w-28 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                    />
                  ) : car.price ? (
                    `$${car.price
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                  ) : car.price === 0 ? (
                    "$0"
                  ) : (
                    ""
                  )}
                </span>
              </div>

              {/* Engine Info */}
              {car.engine && (
                <>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Engine Type
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <input
                          type="text"
                          value={
                            editedSpecs.engine?.type ?? car.engine?.type ?? ""
                          }
                          onChange={(e) =>
                            handleInputChange("engine", e.target.value, "type")
                          }
                          className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                        />
                      ) : (
                        car.engine?.type || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Displacement
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <MeasurementInputWithUnit
                          value={
                            editedSpecs.engine?.displacement ??
                            car.engine?.displacement ?? {
                              value: null,
                              unit: "L",
                            }
                          }
                          onChange={(value) =>
                            handleMeasurementChange(
                              "engine.displacement",
                              value
                            )
                          }
                          availableUnits={["L", "cc"]}
                          className="justify-end"
                        />
                      ) : (
                        formatMeasurement(car.engine?.displacement)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Power Output
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <MeasurementInputWithUnit
                          value={{
                            value:
                              editedSpecs.engine?.power?.hp ??
                              car.engine?.power?.hp ??
                              null,
                            unit: "hp",
                          }}
                          onChange={handlePowerChange}
                          availableUnits={["hp"]}
                          className="justify-end"
                        />
                      ) : car.engine?.power ? (
                        `${car.engine.power.hp} hp / ${car.engine.power.kW} kW / ${car.engine.power.ps} PS`
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Torque
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <MeasurementInputWithUnit
                          value={{
                            value:
                              editedSpecs.engine?.torque?.["lb-ft"] ??
                              car.engine?.torque?.["lb-ft"] ??
                              null,
                            unit: "lb-ft",
                          }}
                          onChange={handleTorqueChange}
                          availableUnits={["lb-ft", "Nm"]}
                          className="justify-end"
                        />
                      ) : car.engine?.torque ? (
                        `${car.engine.torque["lb-ft"]} lb-ft / ${car.engine.torque.Nm} Nm`
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                </>
              )}

              {/* Performance Info */}
              {car.performance && (
                <>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      0-60 mph
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {formatMeasurement(car.performance?.["0_to_60_mph"])}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Top Speed
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {formatMeasurement(car.performance?.top_speed)}
                    </span>
                  </div>
                </>
              )}

              {/* Dimensions */}
              {car.dimensions && (
                <>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Length
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <MeasurementInputWithUnit
                          value={
                            editedSpecs.dimensions?.length ?? {
                              value: car.dimensions?.length?.value ?? null,
                              unit:
                                car.dimensions?.length?.unit ??
                                getUnitsForType("LENGTH")[0],
                            }
                          }
                          onChange={(value) =>
                            handleMeasurementChange(
                              "dimensions",
                              value,
                              "length"
                            )
                          }
                          availableUnits={getUnitsForType("LENGTH")}
                          className="justify-end"
                        />
                      ) : (
                        formatMeasurement(car.dimensions?.length)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Width
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <MeasurementInputWithUnit
                          value={
                            editedSpecs.dimensions?.width ?? {
                              value: car.dimensions?.width?.value ?? null,
                              unit:
                                car.dimensions?.width?.unit ??
                                getUnitsForType("LENGTH")[0],
                            }
                          }
                          onChange={(value) =>
                            handleMeasurementChange(
                              "dimensions",
                              value,
                              "width"
                            )
                          }
                          availableUnits={getUnitsForType("LENGTH")}
                          className="justify-end"
                        />
                      ) : (
                        formatMeasurement(car.dimensions?.width)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Height
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <MeasurementInputWithUnit
                          value={
                            editedSpecs.dimensions?.height ?? {
                              value: car.dimensions?.height?.value ?? null,
                              unit:
                                car.dimensions?.height?.unit ??
                                getUnitsForType("LENGTH")[0],
                            }
                          }
                          onChange={(value) =>
                            handleMeasurementChange(
                              "dimensions",
                              value,
                              "height"
                            )
                          }
                          availableUnits={getUnitsForType("LENGTH")}
                          className="justify-end"
                        />
                      ) : (
                        formatMeasurement(car.dimensions?.height)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Wheelbase
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <MeasurementInputWithUnit
                          value={
                            editedSpecs.dimensions?.wheelbase ?? {
                              value: car.dimensions?.wheelbase?.value ?? null,
                              unit:
                                car.dimensions?.wheelbase?.unit ??
                                getUnitsForType("LENGTH")[0],
                            }
                          }
                          onChange={(value) =>
                            handleMeasurementChange(
                              "dimensions",
                              value,
                              "wheelbase"
                            )
                          }
                          availableUnits={getUnitsForType("LENGTH")}
                          className="justify-end"
                        />
                      ) : (
                        formatMeasurement(car.dimensions?.wheelbase)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Fuel Capacity
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <MeasurementInputWithUnit
                          value={
                            editedSpecs.fuel_capacity ?? {
                              value: car.fuel_capacity?.value ?? null,
                              unit:
                                car.fuel_capacity?.unit ??
                                getUnitsForType("VOLUME")[0],
                            }
                          }
                          onChange={(value) =>
                            handleMeasurementChange("fuel_capacity", value)
                          }
                          availableUnits={getUnitsForType("VOLUME")}
                          className="justify-end"
                        />
                      ) : (
                        formatMeasurement(car.fuel_capacity)
                      )}
                    </span>
                  </div>
                </>
              )}

              {/* Interior Features */}
              {car.interior_features && (
                <>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Color
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <input
                          type="text"
                          value={getInputValue(
                            editedSpecs.interior_color ?? car.interior_color
                          )}
                          onChange={(e) =>
                            handleInputChange("interior_color", e.target.value)
                          }
                          className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                        />
                      ) : (
                        car.interior_color || "N/A"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Seats
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                      {isSpecsEditMode ? (
                        <input
                          type="number"
                          value={getNumberInputValue(
                            editedSpecs.interior_features?.seats ??
                              car.interior_features?.seats
                          )}
                          onChange={(e) =>
                            handleInputChange(
                              "interior_features",
                              e.target.value,
                              "seats"
                            )
                          }
                          className="w-24 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                        />
                      ) : (
                        car.interior_features.seats || "N/A"
                      )}
                    </span>
                  </div>
                </>
              )}

              {/* Transmission */}
              {car.transmission && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Type
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                    {isSpecsEditMode ? (
                      <input
                        type="text"
                        value={getInputValue(
                          editedSpecs.transmission?.type ??
                            car.transmission.type
                        )}
                        onChange={(e) =>
                          handleInputChange(
                            "transmission",
                            e.target.value,
                            "type"
                          )
                        }
                        className="w-48 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#111111]"
                      />
                    ) : (
                      car.transmission.type || "N/A"
                    )}
                  </span>
                </div>
              )}

              {/* Weight */}
              {car.weight && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Curb Weight
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white pr-3">
                    {formatMeasurement(car.weight?.curb_weight)}
                  </span>
                </div>
              )}
            </div>
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
