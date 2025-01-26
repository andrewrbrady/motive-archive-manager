"use client";

import React from "react";
import { InventoryItem } from "@/types/inventory";
import Link from "next/link";

interface InventoryCardProps {
  item: InventoryItem;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({ item }) => {
  return (
    <Link href={`/inventory/${item._id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        {item.images && item.images[0] && (
          <div className="relative aspect-[4/3]">
            <img
              src={item.images[0].url}
              alt={`${item.year} ${item.make} ${item.model}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {item.year} {item.make} {item.model}
          </h3>
          <div className="mt-2 text-gray-600 dark:text-gray-300">
            {item.mileage && <p>{item.mileage.toLocaleString()} miles</p>}
            {item.price && (
              <p className="font-semibold">${item.price.toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
