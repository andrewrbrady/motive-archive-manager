import React from "react";
import Link from "next/link";
import { InventoryItem } from "@/types/inventory";

interface VehicleDetailsProps {
  item: InventoryItem;
}

export default function VehicleDetails({ item }: VehicleDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <Link
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {item.year} {item.make} {item.model}
          </h2>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {item.price && (
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Price</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">
              ${item.price.toLocaleString()}
            </dd>
          </div>
        )}

        {item.mileage && item.mileage.value !== null && (
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">
              Mileage
            </dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">
              {item.mileage.value.toLocaleString()} {item.mileage.unit}
            </dd>
          </div>
        )}

        {item.transmission && (
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">
              Transmission
            </dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">
              {item.transmission}
            </dd>
          </div>
        )}

        {item.dealer && (
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Dealer</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">
              {item.dealer}
            </dd>
          </div>
        )}
      </div>
    </div>
  );
}
