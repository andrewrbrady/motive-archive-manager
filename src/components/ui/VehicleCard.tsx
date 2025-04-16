import React from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { getTimeRemaining } from "@/lib/date-utils";
import { CardImage } from "./CardImage";
import { MeasurementValue } from "@/types/car";
import { cn } from "@/lib/utils";

type BaseVehicle = {
  year: number;
  make: string;
  model: string;
  price?: number;
  mileage?: MeasurementValue;
};

type Car = BaseVehicle & {
  _id: string;
  color?: string;
  vin?: string;
  clientInfo?: {
    name: string;
  };
  images?: Array<{ url: string }>;
};

type InventoryItem = BaseVehicle & {
  id: string;
  url: string;
  primary_image?: string;
  transmission?: string;
  dealer?: string;
  images?: string[];
};

type Auction = BaseVehicle & {
  _id: string;
  link: string;
  title?: string;
  excerpt?: string;
  current_bid?: number;
  end_date: string;
  location?: string;
  platform?: {
    name: string;
  };
  images?: string[];
};

interface VehicleCardProps {
  vehicle: Car | InventoryItem | Auction;
  variant: "car" | "inventory" | "auction";
  _view?: "grid" | "list";
  currentSearchParams?: string;
  showExternalLink?: boolean;
}

export function VehicleCard({
  vehicle,
  variant,
  _view = "grid",
  currentSearchParams,
  showExternalLink,
}: VehicleCardProps) {
  const car = variant === "car" ? (vehicle as Car) : null;
  const auction = variant === "auction" ? (vehicle as Auction) : null;
  const inventory = variant === "inventory" ? (vehicle as InventoryItem) : null;

  // Determine the link URL and target based on variant
  const linkProps = {
    href:
      variant === "car"
        ? `/cars/${(vehicle as Car)._id}${currentSearchParams || ""}`
        : variant === "inventory"
          ? (vehicle as InventoryItem).url
          : (vehicle as Auction).link,
    target: variant === "car" ? undefined : "_blank",
  };

  // Get the image URL based on variant
  const imageUrl = auction
    ? auction.images?.[0]
    : variant === "inventory"
      ? inventory?.images?.[0] || null
      : car?.images?.[0]?.url
        ? `${car.images[0].url}/public`
        : null;

  const labelClasses =
    "text-[10px] uppercase tracking-wider text-text-secondary font-medium p-2";
  const valueClasses = "text-sm text-text-primary font-medium uppercase p-2";
  const sectionClasses = "flex flex-col divide-y divide-border-primary";

  return (
    <div className="bg-background rounded-lg border border-border-primary overflow-hidden">
      {linkProps.href && (
        <Link href={linkProps.href} target={linkProps.target}>
          <div className="relative aspect-[16/9]">
            <CardImage
              src={imageUrl}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={variant === "car"}
            />
          </div>
        </Link>
      )}

      <div className="divide-y divide-border-primary">
        {/* Combined Year Make Model */}
        <div className={sectionClasses}>
          <span className={labelClasses}>Vehicle</span>
          <span className={valueClasses}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-3 divide-x divide-border-primary">
          {variant === "car" ? (
            <>
              <div className={sectionClasses}>
                <span className={labelClasses}>Client</span>
                <span className={valueClasses}>
                  {car?.clientInfo?.name || "N/A"}
                </span>
              </div>
              <div className={sectionClasses}>
                <span className={labelClasses}>VIN</span>
                <span className={valueClasses}>{car?.vin || "N/A"}</span>
              </div>
              <div className={sectionClasses}>
                <span className={labelClasses}>Mileage</span>
                <span className={valueClasses}>
                  {vehicle.mileage && vehicle.mileage.value !== null
                    ? `${vehicle.mileage.value.toLocaleString()} ${
                        vehicle.mileage.unit
                      }`
                    : "N/A"}
                </span>
              </div>
            </>
          ) : variant === "inventory" ? (
            <>
              <div className={sectionClasses}>
                <span className={labelClasses}>Transmission</span>
                <span className={valueClasses}>
                  {inventory?.transmission || "N/A"}
                </span>
              </div>
              <div className={sectionClasses}>
                <span className={labelClasses}>Dealer</span>
                <span className={valueClasses}>
                  {inventory?.dealer || "N/A"}
                </span>
              </div>
              {vehicle.mileage && vehicle.mileage.value !== null && (
                <div className={sectionClasses}>
                  <span className={labelClasses}>Mileage</span>
                  <span className={valueClasses}>
                    {vehicle.mileage.value.toLocaleString()}{" "}
                    {vehicle.mileage.unit}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={sectionClasses}>
                <span className={labelClasses}>Current Bid</span>
                <span className={valueClasses}>
                  ${auction?.current_bid?.toLocaleString() || "NO BIDS"}
                </span>
              </div>
              <div className={sectionClasses}>
                <span className={labelClasses}>Time Left</span>
                <span className={cn(valueClasses, "flex items-center")}>
                  <Clock className="w-4 h-4 mr-1 text-text-secondary" />
                  {getTimeRemaining(auction?.end_date)}
                </span>
              </div>
              <div className={sectionClasses}>
                <span className={labelClasses}>Location</span>
                <span className={cn(valueClasses, "flex items-center")}>
                  <MapPin className="w-4 h-4 mr-1 text-text-secondary" />
                  {auction?.location || "N/A"}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Price Info */}
        {!auction && vehicle.price && (
          <div className={sectionClasses}>
            <span className={labelClasses}>Price</span>
            <span className="text-lg text-text-primary font-semibold p-2">
              ${vehicle.price.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
