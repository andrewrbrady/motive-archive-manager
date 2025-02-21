"use client";

// components/cars/CarCard.tsx
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Car, CarImage as CarImageType } from "@/types/car";
import { Trash2, Loader2 } from "lucide-react";
import { MotiveLogo } from "@/components/ui/MotiveLogo";
import { cn } from "@/lib/utils";

interface CarCardProps {
  car: Car;
  currentSearchParams?: string;
}

export default function CarCard({ car, currentSearchParams }: CarCardProps) {
  console.log("CarCard: Component rendering with car:", car._id);
  console.log("CarCard: Full car data:", {
    id: car._id,
    make: car.make,
    model: car.model,
    imageIds: car.imageIds,
    images: car.images,
    hasImageIds: Boolean(car.imageIds?.length),
    hasImages: Boolean(car.images?.length),
  });

  const [primaryImage, setPrimaryImage] = useState<Pick<
    CarImageType,
    "id" | "url"
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("CarCard: useEffect triggered for car:", car._id);

    const fetchPrimaryImage = async () => {
      console.log("CarCard: Starting to fetch image for car:", car._id);
      setPrimaryImage(null);
      setLoading(true);

      // First check if we have direct images array
      if (car.images?.[0]?.url) {
        console.log("CarCard: Using direct image URL");
        setPrimaryImage({
          id: car.images[0].id,
          url: `${car.images[0].url}/public`,
        });
        setLoading(false);
        return;
      }

      // Fall back to imageIds if no direct images
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
            id: data[0].imageId,
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
  }, [car._id, car.imageIds, car.images]);

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
      className="block bg-background rounded-lg border border-border-primary overflow-hidden hover:border-border-secondary transition-colors relative group"
    >
      {/* Image */}
      <div className="relative aspect-[16/9]">
        {loading ? (
          <div className="w-full h-full bg-background-primary/50 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
            <span className="text-sm font-medium text-text-secondary">
              Loading...
            </span>
          </div>
        ) : primaryImage ? (
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
          <div className="w-full h-full bg-black/10 dark:bg-black/40 flex items-center justify-center">
            <div className="flex items-center gap-4 px-6">
              <MotiveLogo className="w-12 h-12 text-text-primary fill-current" />
              <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                No Image
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Button - Absolutely positioned */}
      <button
        onClick={handleDelete}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-full border transition-all duration-base",
          "text-accent-error hover:text-accent-error/90",
          "border-accent-error/20 hover:border-accent-error/30",
          "bg-background-primary/90 hover:bg-background-primary",
          "opacity-0 group-hover:opacity-100"
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Car Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-text-primary">
          {car.year} {car.make} {car.model}
          <span className="ml-1 text-text-secondary">
            {car.manufacturing?.series || "Base"}
          </span>
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          {car.manufacturing?.trim || "Standard"}
        </p>
        <div className="mt-2 space-y-1">
          {car.price && (
            <p className="text-sm text-text-secondary">
              {car.price.listPrice !== null
                ? `$${car.price.listPrice.toLocaleString()}`
                : "Price on request"}
              {car.status === "sold" && car.price.soldPrice && (
                <span className="ml-2 text-accent-success">
                  (Sold: ${car.price.soldPrice.toLocaleString()})
                </span>
              )}
            </p>
          )}
          {car.mileage && (
            <p className="text-sm text-text-secondary">
              {formatMileage(car.mileage)}
            </p>
          )}
          {car.location && (
            <p className="text-sm text-text-secondary">{car.location}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
