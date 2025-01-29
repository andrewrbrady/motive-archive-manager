import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin } from "lucide-react";
import { getTimeRemaining } from "@/lib/utils";
import { MotiveLogo } from "./MotiveLogo";

type BaseVehicle = {
  year: number;
  make: string;
  model: string;
  price?: number;
  mileage?: number;
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
    href: auction
      ? auction.link
      : variant === "inventory"
      ? inventory?.url
      : `/cars/${car?._id}${
          currentSearchParams ? `?${currentSearchParams}` : ""
        }`,
    target: showExternalLink ? "_blank" : undefined,
  };

  // Get the image URL based on variant
  const imageUrl = auction
    ? auction.images?.[0]
    : variant === "inventory"
    ? inventory?.images?.[0] || null
    : car?.images?.[0]?.url
    ? `${car.images[0].url}/public`
    : null;

  return (
    <div className="bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <Link {...linkProps}>
        <div className="relative aspect-[16/9]">
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
            <div className="w-full h-full bg-gray-50 dark:bg-black flex items-center justify-center">
              <MotiveLogo className="w-16 h-16 opacity-50" />
            </div>
          )}
        </div>
      </Link>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {/* Combined Year Make Model */}
        <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
            Vehicle
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-200 font-medium uppercase p-2">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800">
          {variant === "car" ? (
            <>
              <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
                  Client
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium uppercase p-2">
                  {car?.clientInfo?.name || "N/A"}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
                  VIN
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium uppercase p-2">
                  {car?.vin || "N/A"}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
                  Mileage
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium uppercase p-2">
                  {vehicle.mileage
                    ? `${vehicle.mileage.toLocaleString()} MILES`
                    : "N/A"}
                </span>
              </div>
            </>
          ) : variant === "inventory" ? (
            <>
              <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
                  Transmission
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium uppercase p-2">
                  {inventory?.transmission || "N/A"}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
                  Dealer
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium uppercase p-2">
                  {inventory?.dealer || "N/A"}
                </span>
              </div>
              {vehicle.mileage && (
                <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
                    Mileage
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-200 font-medium uppercase p-2">
                    {vehicle.mileage.toLocaleString()} MILES
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
                  Current Bid
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium uppercase p-2">
                  ${auction?.current_bid?.toLocaleString() || "NO BIDS"}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
                  Time Left
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium flex items-center uppercase p-2">
                  <Clock className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
                  {getTimeRemaining(auction?.end_date)}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
                  Location
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium flex items-center uppercase p-2">
                  <MapPin className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
                  {auction?.location || "N/A"}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Price Info */}
        {!auction && vehicle.price && (
          <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium p-2">
              Price
            </span>
            <span className="text-lg text-gray-700 dark:text-gray-200 font-semibold p-2">
              ${vehicle.price.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
