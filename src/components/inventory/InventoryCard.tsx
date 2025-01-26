"use client";

import React from "react";
import Link from "next/link";
import { VehicleDetails } from "./VehicleDetails";
import { InventoryItem } from "./types";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

interface InventoryCardProps {
  item: InventoryItem;
  showExternalLink?: boolean;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
  item,
  showExternalLink = false,
}) => {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/inventory/${item.id}`}>
        <div className="relative aspect-[16/10] w-full mb-6">
          <ImageWithFallback
            src={item.images[0]}
            alt={`${item.year} ${item.make} ${item.model}`}
            fill
            className="object-cover rounded-lg"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {item.images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              +{item.images.length - 1} photos
            </div>
          )}
        </div>
      </Link>
      <VehicleDetails item={item} showExternalLink={showExternalLink} />
    </div>
  );
};
