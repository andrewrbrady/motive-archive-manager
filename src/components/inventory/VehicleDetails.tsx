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
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] dark:text-white hover:text-info-600 dark:hover:text-info-400 transition-colors">
            {item.year} {item.make} {item.model}
          </h2>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {item.price && (
          <div>
            <dt className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">Price</dt>
            <dd className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
              ${item.price.toLocaleString()}
            </dd>
          </div>
        )}

        {item.mileage && item.mileage.value !== null && (
          <div>
            <dt className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
              Mileage
            </dt>
            <dd className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
              {item.mileage.value.toLocaleString()} {item.mileage.unit}
            </dd>
          </div>
        )}

        {item.transmission && (
          <div>
            <dt className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">
              Transmission
            </dt>
            <dd className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
              {item.transmission}
            </dd>
          </div>
        )}

        {item.dealer && (
          <div>
            <dt className="text-sm text-[hsl(var(--foreground-muted))] dark:text-[hsl(var(--foreground-muted))]">Dealer</dt>
            <dd className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
              {item.dealer}
            </dd>
          </div>
        )}
      </div>
    </div>
  );
}
