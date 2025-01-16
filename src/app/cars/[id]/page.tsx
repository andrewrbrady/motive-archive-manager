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
  brand: string;
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
    setUploadingImages(true);

    // Initialize progress tracking for each file
    setUploadProgress(
      Array.from(files).map((file) => ({
        fileName: file.name,
        progress: 0,
        status: "pending" as const,
        currentStep: "Preparing upload...",
      }))
    );

    try {
      // First upload images to Cloudflare
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append(
          "vehicleInfo",
          JSON.stringify({
            year: car.year,
            brand: car.brand,
            model: car.model,
            type: car.type,
          })
        );

        const xhr = new XMLHttpRequest();

        const uploadPromise = new Promise<{
          id: string;
          url: string;
          filename: string;
          metadata: Record<string, any>;
        }>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded * 100) / event.total);
              setUploadProgress((prev) =>
                prev.map((p) =>
                  p.fileName === file.name
                    ? {
                        ...p,
                        progress,
                        status: "uploading" as const,
                        currentStep: `Uploading: ${progress}%`,
                      }
                    : p
                )
              );
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress((prev) =>
                prev.map((p) =>
                  p.fileName === file.name
                    ? {
                        ...p,
                        progress: 100,
                        status: "analyzing" as const,
                        currentStep: "Analyzing image with AI...",
                      }
                    : p
                )
              );
              const response = JSON.parse(xhr.responseText);
              resolve({
                id: response.imageId,
                url: response.imageUrl,
                filename: file.name,
                metadata: response.metadata || {},
              });
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"));
          });

          xhr.open("POST", "/api/cloudflare/images");
          xhr.send(formData);
        });

        try {
          const imageData = await uploadPromise;
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.fileName === file.name
                ? {
                    ...p,
                    progress: 100,
                    status: "complete" as const,
                    currentStep: "Upload complete!",
                  }
                : p
            )
          );
          return {
            id: imageData.id,
            url: imageData.url,
            filename: imageData.filename,
            metadata: {
              ...imageData.metadata,
              angle: imageData.metadata?.aiAnalysis?.angle || "",
              description: imageData.metadata?.aiAnalysis?.description || "",
              movement: imageData.metadata?.aiAnalysis?.movement || "",
              tod: imageData.metadata?.aiAnalysis?.tod || "",
              view: imageData.metadata?.aiAnalysis?.view || "",
              side: imageData.metadata?.aiAnalysis?.side || "",
            },
            variants: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } catch (error) {
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.fileName === file.name
                ? {
                    ...p,
                    status: "error" as const,
                    error: "Failed to upload image",
                    currentStep: "Upload failed",
                  }
                : p
            )
          );
          throw error;
        }
      });

      const uploadedImages = await Promise.all(uploadPromises);

      // Then update the car with new image objects
      const response = await fetch(`/api/cars/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: [...(car.images || []), ...uploadedImages],
        }),
      });

      if (!response.ok) throw new Error("Failed to update car images");

      const data = await response.json();
      setCar(data);
    } catch (error) {
      console.error("Error uploading images:", error);
      setUploadProgress((prev) =>
        prev.map((p) =>
          p.status === "pending" || p.status === "uploading"
            ? {
                ...p,
                status: "error" as const,
                error: "Upload failed",
                currentStep: "Upload failed",
              }
            : p
        )
      );
    } finally {
      // Wait a moment to show completion status before clearing
      setTimeout(() => {
        setUploadingImages(false);
        setUploadProgress([]);
      }, 2000);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold uppercase tracking-tight">
                {car.year} {car.brand} {car.model}
                {car.type && (
                  <span className="text-sm uppercase tracking-wider text-gray-500 ml-2 font-medium">
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
                  {uploadingImages ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
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
                  )}
                </button>
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
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
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) {
                  handleImageUpload(e.target.files);
                }
              }}
              className="hidden"
              multiple
              accept="image/*"
            />

            <ImageGallery
              images={car.images}
              isEditMode={isEditMode}
              onRemoveImage={handleRemoveImage}
              onImagesChange={handleImageUpload}
              uploading={uploadingImages}
              uploadProgress={uploadProgress}
              showMetadata={true}
              vehicleInfo={{
                year: car.year,
                brand: car.brand,
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

          {/* Car Details */}
          <div className="space-y-6">
            <section>
              <h2 className="text-3xl font-bold">
                {car.year} {car.brand} {car.model}
                {car.type && (
                  <span className="text-sm uppercase tracking-wider text-gray-500 ml-2 font-medium">
                    {car.type}
                  </span>
                )}
              </h2>
              <p className="text-2xl font-semibold mt-2">{car.price}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Vehicle Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="font-medium">Brand:</div>
                <div>{car.brand}</div>
                <div className="font-medium">Model:</div>
                <div>{car.model}</div>
                <div className="font-medium">Year:</div>
                <div>{car.year}</div>
                <div className="font-medium">Mileage:</div>
                <div>{car.mileage || "N/A"}</div>
                <div className="font-medium">Color:</div>
                <div>{car.color || "N/A"}</div>
                <div className="font-medium">Location:</div>
                <div>{car.location || "N/A"}</div>
              </div>
            </section>

            {car.engine && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Engine Specifications</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="font-medium">Type:</div>
                  <div>{car.engine.type}</div>
                  <div className="font-medium">Displacement:</div>
                  <div>{car.engine.displacement}</div>
                  {car.engine.features && car.engine.features.length > 0 && (
                    <>
                      <div className="font-medium">Features:</div>
                      <div>{car.engine.features.join(", ")}</div>
                    </>
                  )}
                </div>
              </section>
            )}

            {car.description && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">Description</h2>
                <p className="whitespace-pre-wrap">{car.description}</p>
              </section>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-6">
            <section className="space-y-4">
              <DocumentsClient carId={id} initialDocuments={documents} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
