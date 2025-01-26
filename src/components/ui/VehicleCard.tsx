import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin } from "lucide-react";
import { getTimeRemaining } from "@/lib/utils";

type BaseVehicle = {
  year: number;
  make: string;
  model: string;
  price?: number;
  mileage?: number;
};

type Car = BaseVehicle & {
  _id: string;
  type?: string;
  color?: string;
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
  view?: "grid" | "list";
  currentSearchParams?: string;
  showExternalLink?: boolean;
}

export function VehicleCard({
  vehicle,
  variant,
  view = "grid",
  currentSearchParams,
  showExternalLink,
}: VehicleCardProps) {
  const isGridView = view === "grid";
  const isAuction = variant === "auction";
  const auction = vehicle as Auction;
  const car = vehicle as Car;
  const inventory = vehicle as InventoryItem;

  // Determine the link URL and target based on variant
  const linkProps = {
    href: isAuction
      ? auction.link
      : variant === "inventory"
      ? inventory.url
      : `/cars/${car._id}${
          currentSearchParams ? `?${currentSearchParams}` : ""
        }`,
    target: showExternalLink ? "_blank" : undefined,
  };

  // Get the image URL based on variant
  const imageUrl = isAuction
    ? auction.images?.[0]
    : variant === "inventory"
    ? inventory.images?.[0] || null
    : car.images?.[0]?.url
    ? `${car.images[0].url}/public`
    : null;

  console.log("Final imageUrl:", imageUrl);

  return (
    <div
      className={`bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden ${
        !isGridView ? "flex" : ""
      }`}
    >
      <Link {...linkProps}>
        <div
          className={`relative ${isGridView ? "aspect-[16/9]" : "w-48 h-48"}`}
        >
          {imageUrl ? (
            variant === "car" ? (
              <Image
                src={imageUrl}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority
              />
            ) : (
              <img
                src={imageUrl}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="object-cover w-full h-full"
              />
            )
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-black flex items-center justify-center text-gray-500 dark:text-gray-400">
              No Image Available
            </div>
          )}
        </div>
      </Link>

      <div className={`p-4 ${!isGridView ? "flex-1" : ""}`}>
        <Link
          {...linkProps}
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {isAuction && auction.title
            ? auction.title
            : [vehicle.year, vehicle.make, vehicle.model]
                .filter(Boolean)
                .join(" ")}
          {variant === "car" && car.type && (
            <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-2 font-medium">
              {car.type}
            </span>
          )}
        </Link>

        {isAuction && auction.excerpt && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {auction.excerpt}
          </p>
        )}

        <div className="mt-2 space-y-1">
          {/* Price/Bid Information */}
          {isAuction ? (
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current Bid
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  ${auction.current_bid?.toLocaleString() || "No Bids"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Time Left
                </div>
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <Clock className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
                  {getTimeRemaining(auction.end_date)}
                </div>
              </div>
            </div>
          ) : (
            vehicle.price && (
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ${vehicle.price.toLocaleString()}
              </p>
            )
          )}

          {/* Common Vehicle Details */}
          {vehicle.mileage && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {vehicle.mileage.toLocaleString()} miles
            </p>
          )}

          {/* Variant-specific Details */}
          {variant === "car" && car.color && car.color !== "NaN" && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Color: {car.color}
            </p>
          )}

          {variant === "inventory" && inventory.transmission && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {inventory.transmission}
            </p>
          )}

          {/* Dealer/Platform Information */}
          {variant === "car" && car.clientInfo?.name && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Dealer: {car.clientInfo.name}
            </p>
          )}

          {variant === "inventory" && inventory.dealer && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {inventory.dealer}
            </p>
          )}

          {isAuction && (
            <div className="mt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
                {auction.location || "N/A"}
              </div>
              <div>{auction.platform?.name || "Unknown Platform"}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
