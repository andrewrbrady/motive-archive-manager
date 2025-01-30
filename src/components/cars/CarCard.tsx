"use client";

// components/cars/CarCard.tsx
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Car } from "@/types/car";
import { Trash2 } from "lucide-react";

interface CarImage {
  _id: string;
  url: string;
}

interface CarCardProps {
  car: Car;
  currentSearchParams: string;
}

export default function CarCard({ car, currentSearchParams }: CarCardProps) {
  console.log("CarCard: Component rendering with car:", car._id);
  console.log("CarCard: Full car data:", {
    id: car._id,
    make: car.make,
    model: car.model,
    imageIds: car.imageIds,
    hasImageIds: Boolean(car.imageIds?.length),
  });

  const [primaryImage, setPrimaryImage] = useState<CarImage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("CarCard: useEffect triggered for car:", car._id);

    const fetchPrimaryImage = async () => {
      console.log("CarCard: Starting to fetch image for car:", car._id);
      setPrimaryImage(null);
      setLoading(true);

      if (!car.imageIds?.[0]) {
        console.log("CarCard: No image IDs available");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/images/metadata?ids=${car.imageIds[0]}`
        );
        console.log("CarCard: Response received:", {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
        });

        if (!response.ok) {
          console.error("CarCard: Response not OK:", {
            status: response.status,
            statusText: response.statusText,
          });
          throw new Error("Failed to fetch image metadata");
        }

        const data = await response.json();
        console.log("CarCard: Image metadata received:", data);

        if (data && data[0]) {
          setPrimaryImage({
            _id: data[0].imageId,
            url: `${data[0].url}/public`,
          });
        } else {
          console.error("CarCard: No image data in response");
        }
      } catch (error) {
        console.error("CarCard: Error fetching image:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrimaryImage();
  }, [car._id, car.imageIds]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation

    if (
      !window.confirm(
        "Are you sure you want to delete this car? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/cars/${car._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete car");
      }

      // Refresh the page to update the list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting car:", error);
      alert("Failed to delete car. Please try again.");
    }
  };

  // Helper function to safely format mileage
  const formatMileage = (mileage: Car["mileage"]) => {
    if (!mileage || typeof mileage.value !== "number") return null;
    return `${mileage.value.toLocaleString()} ${mileage.unit || "mi"}`;
  };

  return (
    <Link
      href={`/cars/${car._id}${
        currentSearchParams ? `?${currentSearchParams}` : ""
      }`}
      className="block bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors relative group"
    >
      {/* Image */}
      <div className="relative aspect-[16/9]">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={`${car.year} ${car.make} ${car.model}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            onError={(e) => {
              console.error("CarCard: Image failed to load:", {
                url: primaryImage.url,
                carId: car._id,
              });
            }}
            onLoad={() => {
              console.log("CarCard: Image loaded successfully:", {
                url: primaryImage.url,
                carId: car._id,
              });
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-black flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-600">
              {loading ? "Loading..." : "No Image"}
            </span>
          </div>
        )}
      </div>

      {/* Delete Button - Absolutely positioned */}
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 bg-white dark:bg-black/50 opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Car Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {car.year} {car.make} {car.model}
        </h3>
        <div className="mt-2 space-y-1">
          {car.price && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              $
              {typeof car.price === "number"
                ? car.price.toLocaleString()
                : car.price}
            </p>
          )}
          {car.mileage && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatMileage(car.mileage)}
            </p>
          )}
          {car.location && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {car.location}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
