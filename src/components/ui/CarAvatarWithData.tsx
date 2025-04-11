import React, { useEffect, useState } from "react";
import { CarAvatar } from "./CarAvatar";
import type { CarImage } from "@/types/car";

interface CarAvatarWithDataProps {
  carId: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  tooltipContent?: React.ReactNode;
  className?: string;
}

interface MinimalCarData {
  _id: string;
  make: string;
  model: string;
  year: number;
  primaryImageId?: string;
}

export function CarAvatarWithData({
  carId,
  size,
  showTooltip,
  tooltipContent,
  className,
}: CarAvatarWithDataProps) {
  const [car, setCar] = useState<MinimalCarData | null>(null);
  const [primaryImage, setPrimaryImage] = useState<CarImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First fetch basic car data
        const carResponse = await fetch(
          `/api/cars/${carId}?fields=make,model,year,primaryImageId`
        );

        if (!carResponse.ok) {
          throw new Error("Failed to fetch car data");
        }

        const carData = await carResponse.json();
        setCar(carData);

        // If we have a primaryImageId, fetch that image directly
        if (carData.primaryImageId) {
          const imageResponse = await fetch(
            `/api/images/${carData.primaryImageId}`
          );
          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            setPrimaryImage(imageData);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      }
    };

    if (carId) {
      fetchData();
    }
  }, [carId]);

  if (error) {
    return (
      <CarAvatar
        images={[]}
        alt="Failed to load car"
        size={size}
        className={className}
        showTooltip={showTooltip}
        tooltipContent={<p>Error: {error}</p>}
      />
    );
  }

  if (!car) {
    return (
      <CarAvatar
        images={[]}
        alt="Loading..."
        size={size}
        className={className}
      />
    );
  }

  const title = [car.year, car.make, car.model].filter(Boolean).join(" ");

  return (
    <CarAvatar
      images={primaryImage ? [primaryImage] : []}
      primaryImageId={car.primaryImageId}
      alt={title}
      size={size}
      showTooltip={showTooltip}
      tooltipContent={tooltipContent}
      className={className}
    />
  );
}
