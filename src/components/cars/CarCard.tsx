// components/cars/CarCard.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Car } from "@/types/car";
import { Trash2 } from "lucide-react";

interface CarCardProps {
  car: Car;
  currentSearchParams: string;
}

export default function CarCard({ car, currentSearchParams }: CarCardProps) {
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
      href={`/cars/${car._id}?${currentSearchParams}`}
      className="block bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
    >
      <div className="relative aspect-video bg-gray-100 dark:bg-black/25">
        {car.images && car.images[0] ? (
          <Image
            src={`${car.images[0].url}/public`}
            alt={`${car.year} ${car.make} ${car.model}`}
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            No Image
          </div>
        )}
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors rounded-full bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {car.year} {car.make} {car.model}
        </h3>
        <div className="mt-2 space-y-1">
          {car.price && (
            <p className="text-gray-700 dark:text-gray-300">
              ${car.price.toLocaleString()}
            </p>
          )}
          {car.mileage && formatMileage(car.mileage) && (
            <p className="text-gray-600 dark:text-gray-400">
              {formatMileage(car.mileage)}
            </p>
          )}
          {car.location && (
            <p className="text-gray-600 dark:text-gray-400">{car.location}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
