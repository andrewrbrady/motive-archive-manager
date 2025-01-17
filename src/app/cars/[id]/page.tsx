"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ImageGallery } from "@/components/ImageGallery";
import Navbar from "@/components/layout/navbar";
import DocumentsClient from "@/app/documents/DocumentsClient";
import { Loader2 } from "lucide-react";
import { DeleteImageDialog } from "@/components/DeleteImageDialog";

interface Engine {
  type: string;
  displacement?: number;
  features?: string[];
  transmission?: string;
  fuelType?: string;
}

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color: string;
  horsepower: number;
  condition: string;
  location: string;
  description: string;
  type?: string;
  vin?: string;
  images: {
    id: string;
    url: string;
    filename: string;
    metadata: {
      angle?: string;
      description?: string;
      movement?: string;
      tod?: string;
      view?: string;
      side?: string;
    };
    variants?: {
      [key: string]: string;
    };
    createdAt: string;
    updatedAt: string;
  }[];
  owner_id?: string;
  engine?: Engine;
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

export default function CarPage() {
  const { id } = useParams() as { id: string };
  const [car, setCar] = useState<Car | null>(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
          imageData: {
            id: string;
            url: string;
            filename: string;
            metadata: any;
            variants: {};
            createdAt: string;
            updatedAt: string;
          };
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
            imageData: any;
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    );
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
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl uppercase font-medium tracking-wide">
            {car.year} {car.make} {car.model}
            {car.type && (
              <span className="text-xs uppercase tracking-wider text-gray-500 ml-2 font-medium">
                {car.type}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full hover:bg-gray-100 border border-gray-200"
              aria-label="Add images"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <button
              onClick={async () => {
                const newEditMode = !isEditMode;
                setIsEditMode(newEditMode);
              }}
              className={`p-2 transition-colors rounded-full hover:bg-gray-100 border ${
                isEditMode
                  ? "text-blue-500 hover:text-blue-600 border-blue-200"
                  : "text-gray-500 hover:text-gray-700 border-gray-200"
              }`}
              aria-label="Edit images"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 transition-colors rounded-full hover:bg-gray-100 border ${
                showFilters
                  ? "text-blue-500 hover:text-blue-600 border-blue-200"
                  : "text-gray-500 hover:text-gray-700 border-gray-200"
              }`}
              aria-label="Toggle filters"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          <ImageGallery
            images={car.images}
            isEditMode={isEditMode}
            onRemoveImage={handleRemoveImage}
            onImagesChange={(files) => {
              handleImageUpload(files);
            }}
            uploading={uploadingImages}
            uploadProgress={uploadProgress}
            setUploadProgress={setUploadProgress}
            showMetadata={true}
            showFilters={showFilters}
            vehicleInfo={{
              year: car.year,
              make: car.make,
              model: car.model,
              type: car.type,
            }}
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
          <h2 className="text-sm uppercase tracking-wide font-medium text-gray-600 mb-4">
            Specifications
          </h2>
          <div className="bg-gray-50/50 border rounded-lg">
            <div className="divide-y">
              <div className="grid grid-cols-12 divide-x text-sm">
                <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                  Year
                </div>
                <div className="col-span-2 font-medium p-2 flex items-center uppercase">
                  {car.year}
                </div>
                <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                  Make
                </div>
                <div className="col-span-2 font-medium p-2 flex items-center uppercase">
                  {car.make}
                </div>
                <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                  Model
                </div>
                <div className="col-span-2 font-medium p-2 flex items-center uppercase">
                  {car.model}
                </div>
              </div>

              <div className="grid grid-cols-12 divide-x text-sm">
                <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                  Type
                </div>
                <div className="col-span-2 font-medium p-2 flex items-center uppercase">
                  {car.type || "N/A"}
                </div>
                <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                  Color
                </div>
                <div className="col-span-2 font-medium p-2 flex items-center uppercase">
                  {car.color || "N/A"}
                </div>
                <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                  Mileage
                </div>
                <div className="col-span-2 font-medium p-2 flex items-center uppercase">
                  {car.mileage.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-12 divide-x text-sm">
                <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                  VIN
                </div>
                <div className="col-span-10 font-medium font-mono text-sm p-2 flex items-center uppercase">
                  {car.vin || "N/A"}
                </div>
              </div>

              <div className="grid grid-cols-12 divide-x text-sm">
                <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                  Location
                </div>
                <div className="col-span-6 font-medium p-2 flex items-center uppercase">
                  {car.location || "N/A"}
                </div>
                <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                  Price
                </div>
                <div className="col-span-2 font-medium p-2 flex items-center uppercase">
                  ${car.price.toLocaleString()}
                </div>
              </div>

              {car.engine && (
                <div className="grid grid-cols-12 divide-x text-sm">
                  <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                    Engine
                  </div>
                  <div className="col-span-6 font-medium p-2 flex items-center uppercase">
                    {car.engine.type}
                  </div>
                  <div className="col-span-2 text-gray-600 uppercase text-xs font-medium p-2 flex items-center">
                    Displacement
                  </div>
                  <div className="col-span-2 font-medium p-2 flex items-center uppercase">
                    {car.engine.displacement || "N/A"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Car Details */}
          <div className="space-y-6">
            {car.description && (
              <section className="space-y-4">
                <h2 className="text-sm uppercase tracking-wide font-medium text-gray-600">
                  Description
                </h2>
                <p className="whitespace-pre-wrap">{car.description}</p>
              </section>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-6">
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm uppercase tracking-wide font-medium text-gray-600">
                  Service History
                </h2>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100 border border-gray-200"
                  aria-label="Add document"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
              <DocumentsClient carId={id} initialDocuments={documents} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
