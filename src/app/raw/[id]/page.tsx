"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import ImageGallery from "@/components/ImageGallery";
import { Loader2 } from "lucide-react";

interface Engine {
  type: string;
  displacement?: string;
  power_output?: string;
  torque?: string;
  features?: string[];
}

interface Car {
  _id: string;
  make: string;
  model: string;
  year: string;
  price: string;
  mileage: string;
  color: string;
  engine: Engine;
  horsepower: number;
  condition: string;
  location: string;
  description: string;
  images: string[];
  history_report: string;
  type: string;
}

export default function CarPage() {
  const params = useParams();
  const router = useRouter();
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    const fetchCar = async () => {
      if (!params.id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/cars/${params.id}`);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch car: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        if (!data) {
          throw new Error("No data received");
        }

        console.log("Car data:", data);
        setCar(data);
      } catch (err) {
        console.error("Error fetching car:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchCar();
  }, [params.id]);

  const handleImageUpload = async (fileList: FileList) => {
    if (!car || !fileList.length) return;

    setUploadingImages(true);
    try {
      const files = Array.from(fileList);
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(`/api/cars/${params.id}/images`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload images");
      }

      const data: { imageUrls: string[] } = await response.json();
      setCar((prevCar) => ({
        ...prevCar!,
        images: [...prevCar!.images, ...data.imageUrls],
      }));
    } catch (err) {
      console.error("Error uploading images:", err);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = async (indices: number[]) => {
    try {
      const index = indices[0]; // We'll handle one image at a time for now
      const imageUrl = car.images[index];
      const response = await fetch(`/api/cars/${params.id}/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (response.ok) {
        const newImages = [...car.images];
        newImages.splice(index, 1);
        setCar({ ...car, images: newImages });
      }
    } catch (error) {
      console.error("Error removing image:", error);
    }
  };

  const handleSave = async () => {
    if (!car) return;

    try {
      const response = await fetch(`/api/cars/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(car),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      setIsEditMode(false);
    } catch (err) {
      console.error("Error saving changes:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || "Car not found"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <button
          onClick={() => router.back()}
          className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          ← Back
        </button>

        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">
                {car.year} {car.make} {car.model}
                {car.type && (
                  <span className="text-sm uppercase tracking-wider text-gray-500 ml-2 font-medium">
                    {car.type}
                  </span>
                )}
              </h1>
              <button
                onClick={() =>
                  isEditMode ? handleSave() : setIsEditMode(true)
                }
                className={`px-4 py-2 rounded-lg ${
                  isEditMode
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "border border-gray-300 hover:border-gray-400"
                }`}
              >
                {isEditMode ? "Save Changes" : "Edit"}
              </button>
            </div>

            <ImageGallery
              images={car.images.map((url) => ({
                id: url,
                url,
                filename: url.split("/").pop() || "",
                metadata: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }))}
              title={`${car.year} ${car.make} ${car.model}`}
              isEditMode={isEditMode}
              onRemoveImage={handleRemoveImage}
              onImagesChange={handleImageUpload}
              uploading={uploadingImages}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Car Details */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Details</h2>
                  <div className="space-y-4">
                    {isEditMode ? (
                      <>
                        <input
                          value={car.price}
                          onChange={(e) =>
                            setCar({ ...car, price: e.target.value })
                          }
                          placeholder="Price"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          value={car.mileage}
                          onChange={(e) =>
                            setCar({ ...car, mileage: e.target.value })
                          }
                          placeholder="Mileage"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          value={car.color}
                          onChange={(e) =>
                            setCar({ ...car, color: e.target.value })
                          }
                          placeholder="Color"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                      </>
                    ) : (
                      <>
                        <p>
                          <span className="font-medium">Price:</span>{" "}
                          {car.price}
                        </p>
                        <p>
                          <span className="font-medium">Mileage:</span>{" "}
                          {car.mileage}
                        </p>
                        <p>
                          <span className="font-medium">Color:</span>{" "}
                          {car.color}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4">Description</h2>
                  {isEditMode ? (
                    <textarea
                      value={car.description}
                      onChange={(e) =>
                        setCar({ ...car, description: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      rows={6}
                    />
                  ) : (
                    <p className="text-gray-700">{car.description}</p>
                  )}
                </div>
              </div>

              {/* Engine Details */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    Engine Specifications
                  </h2>
                  <div className="space-y-4">
                    {isEditMode ? (
                      <>
                        <input
                          value={car.engine?.type || ""}
                          onChange={(e) =>
                            setCar({
                              ...car,
                              engine: {
                                ...(car.engine || {}),
                                type: e.target.value,
                              },
                            })
                          }
                          placeholder="Engine Type"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          value={car.engine?.displacement || ""}
                          onChange={(e) =>
                            setCar({
                              ...car,
                              engine: {
                                type: car.engine?.type || "",
                                ...(car.engine || {}),
                                displacement: e.target.value,
                              },
                            })
                          }
                          placeholder="Displacement"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          value={car.horsepower}
                          onChange={(e) =>
                            setCar({
                              ...car,
                              horsepower: parseInt(e.target.value) || 0,
                            })
                          }
                          type="number"
                          placeholder="Horsepower"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                      </>
                    ) : (
                      <>
                        <p>
                          <span className="font-medium">Type:</span>{" "}
                          {car.engine?.type || "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">Displacement:</span>{" "}
                          {car.engine?.displacement || "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">Horsepower:</span>{" "}
                          {car.horsepower || "N/A"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
