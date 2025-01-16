"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ImageGallery } from "@/components/ImageGallery";
import Navbar from "@/components/layout/navbar";
import DocumentsClient from "@/app/documents/DocumentsClient";

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
  images: string[];
  owner_id?: string;
  engine?: Engine;
  clientInfo?: {
    _id: string;
    name: string;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
  status?: "available" | "sold" | "pending";
}

export default function CarPage() {
  const { id } = useParams() as { id: string };
  const [car, setCar] = useState<Car | null>(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const formatImageUrl = (url: string) => {
    return url.endsWith("/public") ? url : `${url}/public`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First fetch the car data
        const carResponse = await fetch(`/api/cars/${id}`);
        if (!carResponse.ok) throw new Error("Failed to fetch car");
        const carData = await carResponse.json();
        // Format image URLs when initially loading the car
        carData.images = (carData.images || []).map(formatImageUrl);
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

    try {
      // First upload images to Cloudflare
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch("/api/cloudflare/images", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image to Cloudflare");
        }

        const { imageUrl } = await uploadResponse.json();
        // Don't format the URL here, as it will be stored without /public in the database
        return imageUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Then update the car with new image URLs
      const response = await fetch(`/api/cars/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: [
            ...(car.images || []).map((url) => url.replace("/public", "")),
            ...uploadedUrls,
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to update car images");

      const data = await response.json();
      // Format all URLs when setting the state
      setCar((prev) => ({
        ...prev!,
        images: (data.images || []).map(formatImageUrl),
      }));
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    if (!car) return;

    try {
      const newImages = (car.images || [])
        .map((url) => url.replace("/public", ""))
        .filter((_, i) => i !== index);
      const response = await fetch(`/api/cars/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: newImages }),
      });

      if (!response.ok) throw new Error("Failed to update images");

      setCar((prev) => ({
        ...prev!,
        images: newImages.map(formatImageUrl),
      }));
    } catch (error) {
      console.error("Error removing image:", error);
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
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold">
                {car.brand} {car.model} {car.year}
              </h1>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isEditMode
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
              </button>
            </div>
            <ImageGallery
              images={car.images || []}
              isEditMode={isEditMode}
              onRemoveImage={handleRemoveImage}
              onImagesChange={handleImageUpload}
              uploading={uploadingImages}
            />
          </div>

          {/* Car Details */}
          <div className="space-y-6">
            <section>
              <h1 className="text-3xl font-bold">
                {car.brand} {car.model} {car.year}
              </h1>
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
