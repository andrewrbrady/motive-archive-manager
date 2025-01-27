"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ImageGallery } from "@/components/ImageGallery";
import Navbar from "@/components/layout/navbar";
import DocumentsClient from "@/app/documents/DocumentsClient";
import { Loader2 } from "lucide-react";
import { DeleteImageDialog } from "@/components/DeleteImageDialog";
import MeasurementInputWithUnit from "@/components/MeasurementInputWithUnit";
import { getUnitsForType } from "@/constants/units";
import { Pencil, Plus } from "lucide-react";
import { PageTitle } from "@/components/ui/PageTitle";
import Footer from "@/components/layout/footer";
import { CarPageSkeleton } from "@/components/ui/CarPageSkeleton";
import { EnrichmentProgress } from "@/components/ui/EnrichmentProgress";

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

interface DeleteStatus {
  imageId: string;
  status: "pending" | "deleting" | "complete" | "error";
  error?: string;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<
    Array<{ index: number; image: { id: string; url: string } }>
  >([]);
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = useState(false);
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
        return {
          ...prev,
          [field]: {
            ...(prev[field] as Record<string, unknown>),
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
    field: keyof EditableSpecs,
    value: MeasurementValue,
    nestedField?: string
  ): void => {
    setEditedSpecs((prev: EditableSpecs) => {
      // Handle nested fields
      if (nestedField && isNestedField(field)) {
        return {
          ...prev,
          [field]: {
            ...(prev[field] as Record<string, unknown>),
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

                // Update UI immediately after successful upload
                setCar((prevCar) => ({
                  ...prevCar!,
                  images: [...prevCar!.images, imageData],
                }));

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
        // Fetch latest car data once for the batch
        const carResponse = await fetch(`/api/cars/${id}`);
        if (!carResponse.ok) {
          throw new Error("Failed to fetch latest car data");
        }
        const latestCarData = await carResponse.json();

        // Update the backend with all new images
        const updatedImages = [...latestCarData.images, ...successfulUploads];
        const dbResponse = await fetch(`/api/cars/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            images: updatedImages,
          }),
        });

        if (!dbResponse.ok) {
          throw new Error("Failed to update car images in database");
        }

        // Sync UI with database state to ensure consistency
        setCar((prevCar) => ({
          ...prevCar!,
          images: updatedImages,
        }));
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

  const handleRemoveImage = async (indices: number[]) => {
    if (!car) return;
    const imagesToRemove = indices.map((index) => ({
      index,
      image: car.images[index],
    }));
    setImagesToDelete(imagesToRemove);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (deleteFromCloudflare: boolean) => {
    if (!car || imagesToDelete.length === 0) return;

    try {
      // Initialize deletion status if deleting from Cloudflare
      if (deleteFromCloudflare) {
        setIsDeleting(true);
        setDeleteStatus(
          imagesToDelete.map(({ image }) => ({
            imageId: image.id,
            status: "pending",
          }))
        );
      }

      // First remove from car
      const indicesToRemove = new Set(imagesToDelete.map((img) => img.index));
      const newImages = car.images.filter((_, i) => !indicesToRemove.has(i));

      const response = await fetch(`/api/cars/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: newImages }),
      });

      if (!response.ok) throw new Error("Failed to update car images");

      // If also deleting from Cloudflare
      if (deleteFromCloudflare) {
        await Promise.all(
          imagesToDelete.map(async ({ image }, index) => {
            const imageId = image.id;
            if (imageId) {
              try {
                // Update status to deleting
                setDeleteStatus((prev) =>
                  prev.map((status, i) =>
                    i === index ? { ...status, status: "deleting" } : status
                  )
                );

                const cloudflareResponse = await fetch(
                  "/api/cloudflare/images",
                  {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ imageId }),
                  }
                );

                if (!cloudflareResponse.ok) {
                  throw new Error("Failed to delete from Cloudflare");
                }

                // Update status to complete
                setDeleteStatus((prev) =>
                  prev.map((status, i) =>
                    i === index ? { ...status, status: "complete" } : status
                  )
                );
              } catch (error) {
                // Update status to error
                setDeleteStatus((prev) =>
                  prev.map((status, i) =>
                    i === index
                      ? {
                          ...status,
                          status: "error",
                          error:
                            error instanceof Error
                              ? error.message
                              : "Failed to delete",
                        }
                      : status
                  )
                );
              }
            }
          })
        );

        // Wait a moment to show completion status before closing
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Update local state
      setCar((prev) => ({
        ...prev!,
        images: newImages,
      }));
    } catch (error) {
      console.error("Error removing images:", error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setImagesToDelete([]);
      setDeleteStatus([]);
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

      if (data.success) {
        // Directly update car state with enriched data
        setCar(data.data);

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
            </div>
          </PageTitle>
        </div>

        {/* Image Gallery */}
        <div className="mb-6">
          <ImageGallery
            images={car.images}
            isEditMode={isEditMode}
            onRemoveImage={handleRemoveImage}
            onImagesChange={(files) => {
              handleImageUpload(files);
            }}
            uploading={uploadingImages}
            uploadProgress={uploadProgress}
            _setUploadProgress={setUploadProgress}
            showMetadata={true}
            showFilters={showFilters}
            _vehicleInfo={{
              year: car.year,
              make: car.make,
              model: car.model,
              type: car.type,
            }}
            title={`${car.year} ${car.make} ${car.model}`}
            aspectRatio="4/3"
            thumbnailsPerRow={8}
            rowsPerPage={3}
          />

          <DeleteImageDialog
            isOpen={deleteDialogOpen}
            onClose={() => {
              setDeleteDialogOpen(false);
              setImagesToDelete([]);
              setDeleteStatus([]);
            }}
            onConfirm={handleDeleteConfirm}
            imageCount={imagesToDelete.length}
            deleteStatus={deleteStatus}
            isDeleting={isDeleting}
          />
        </div>

        {/* Vehicle Information */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm uppercase tracking-wide font-medium text-gray-600 dark:text-gray-400">
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
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {/* Basic Info */}
              <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                  Year
                </div>
                <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                  {isSpecsEditMode ? (
                    <input
                      type="number"
                      value={getNumberInputValue(editedSpecs.year ?? car.year)}
                      onChange={(e) =>
                        handleInputChange("year", e.target.value)
                      }
                      className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                    />
                  ) : (
                    car.year
                  )}
                </div>
                <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                  Make
                </div>
                <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(editedSpecs.make ?? car.make)}
                      onChange={(e) =>
                        handleInputChange("make", e.target.value)
                      }
                      className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                    />
                  ) : (
                    car.make
                  )}
                </div>
                <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                  Model
                </div>
                <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(editedSpecs.model ?? car.model)}
                      onChange={(e) =>
                        handleInputChange("model", e.target.value)
                      }
                      className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                    />
                  ) : (
                    car.model
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                  Color
                </div>
                <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(editedSpecs.color ?? car.color)}
                      onChange={(e) =>
                        handleInputChange("color", e.target.value)
                      }
                      className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                    />
                  ) : (
                    car.color || "N/A"
                  )}
                </div>
                <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                  Mileage
                </div>
                <div className="col-span-7 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
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
                      className="w-full"
                    />
                  ) : car ? (
                    formatMileage(car.mileage)
                  ) : (
                    "0"
                  )}
                </div>
              </div>

              {/* VIN */}
              <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                  VIN
                </div>
                <div className="col-span-11 text-gray-600 dark:text-gray-300 font-medium font-mono text-sm p-2 flex items-center uppercase">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(editedSpecs.vin ?? car.vin)}
                      onChange={(e) => handleInputChange("vin", e.target.value)}
                      className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                    />
                  ) : (
                    car.vin || "N/A"
                  )}
                </div>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                  Client
                </div>
                <div className="col-span-11 text-gray-600 dark:text-gray-300 p-2 flex items-center uppercase">
                  {car.clientInfo?.name || "N/A"}
                </div>
              </div>

              {/* Location and Price */}
              <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                  Location
                </div>
                <div className="col-span-7 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                  {isSpecsEditMode ? (
                    <input
                      type="text"
                      value={getInputValue(
                        editedSpecs.location ?? car.location
                      )}
                      onChange={(e) =>
                        handleInputChange("location", e.target.value)
                      }
                      className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                    />
                  ) : (
                    car.location || "N/A"
                  )}
                </div>
                <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                  Price
                </div>
                <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                  {isSpecsEditMode ? (
                    <input
                      type="number"
                      value={getNumberInputValue(
                        editedSpecs.price ?? car.price
                      )}
                      onChange={(e) =>
                        handleInputChange("price", e.target.value)
                      }
                      className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
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
                </div>
              </div>

              {/* Engine Info */}
              {car.engine && (
                <>
                  <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                    <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                      Engine
                    </div>
                    <div className="col-span-7 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                      {isSpecsEditMode ? (
                        <input
                          type="text"
                          value={getInputValue(
                            editedSpecs.engine?.type ?? car.engine.type
                          )}
                          onChange={(e) =>
                            handleInputChange("engine", e.target.value, "type")
                          }
                          className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                        />
                      ) : (
                        car.engine.type
                      )}
                    </div>
                    <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                      Power
                    </div>
                    <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                      {formatPower(car.engine?.power)}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                    <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                      Torque
                    </div>
                    <div className="col-span-11 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                      {formatTorque(car.engine?.torque)}
                    </div>
                  </div>
                </>
              )}

              {/* Performance Info */}
              {car.performance && (
                <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                  <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                    0-60 mph
                  </div>
                  <div className="col-span-7 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                    {formatMeasurement(car.performance?.["0_to_60_mph"])}
                  </div>
                  <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                    Top Speed
                  </div>
                  <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                    {formatMeasurement(car.performance?.top_speed)}
                  </div>
                </div>
              )}

              {/* Dimensions */}
              {car.dimensions && (
                <>
                  <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                    <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                      Length
                    </div>
                    <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
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
                          className="w-full"
                        />
                      ) : (
                        <span>{formatMeasurement(car.dimensions?.length)}</span>
                      )}
                    </div>
                    <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                      Width
                    </div>
                    <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
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
                          className="w-full"
                        />
                      ) : (
                        <span>{formatMeasurement(car.dimensions?.width)}</span>
                      )}
                    </div>
                    <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                      Height
                    </div>
                    <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
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
                          className="w-full"
                        />
                      ) : (
                        <span>{formatMeasurement(car.dimensions?.height)}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                    <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                      Wheelbase
                    </div>
                    <div className="col-span-7 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
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
                          className="w-full"
                        />
                      ) : (
                        <span>
                          {formatMeasurement(car.dimensions?.wheelbase)}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                      Fuel Cap.
                    </div>
                    <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
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
                          className="w-full"
                        />
                      ) : (
                        <span>{formatMeasurement(car.fuel_capacity)}</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Interior Features */}
              {car.interior_features && (
                <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                  <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                    Interior
                  </div>
                  <div className="col-span-7 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                    {isSpecsEditMode ? (
                      <input
                        type="text"
                        value={getInputValue(
                          editedSpecs.interior_color ?? car.interior_color
                        )}
                        onChange={(e) =>
                          handleInputChange("interior_color", e.target.value)
                        }
                        className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                      />
                    ) : (
                      car.interior_color || "N/A"
                    )}
                  </div>
                  <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                    Seats
                  </div>
                  <div className="col-span-3 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
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
                        className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                      />
                    ) : (
                      car.interior_features.seats || "N/A"
                    )}
                  </div>
                </div>
              )}

              {/* Transmission */}
              {car.transmission && (
                <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                  <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                    Trans.
                  </div>
                  <div className="col-span-11 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
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
                        className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                      />
                    ) : (
                      car.transmission.type || "N/A"
                    )}
                  </div>
                </div>
              )}

              {/* Weight */}
              {car.weight && (
                <div className="grid grid-cols-12 divide-x divide-gray-200 dark:divide-gray-800 text-sm bg-white dark:bg-[#111111]">
                  <div className="col-span-1 text-gray-600 dark:text-gray-400 uppercase text-xs font-medium py-1.5 px-2 flex items-center whitespace-normal min-h-[42px]">
                    Weight
                  </div>
                  <div className="col-span-11 text-gray-600 dark:text-gray-300 font-medium p-2 flex items-center uppercase">
                    {formatMeasurement(car.weight?.curb_weight)}
                  </div>
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
      </main>
      <Footer />
      <EnrichmentProgress
        isVisible={showEnrichProgress}
        step={enrichProgress.step}
        currentStep={enrichProgress.currentStep}
        status={enrichProgress.status}
        error={enrichProgress.error}
        details={enrichProgress.details}
        onClose={() => {
          if (enrichProgress.status !== "processing") {
            setShowEnrichProgress(false);
          }
        }}
      />
    </div>
  );
}
