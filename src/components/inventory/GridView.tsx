import React from "react";
import { InventoryCard } from "./InventoryCard";
import { InventoryItem } from "@/types/inventory";

interface GridViewProps {
  cars: InventoryItem[];
}

export function GridView({ cars }: GridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cars.map((car) => (
        <InventoryCard key={car.id} item={car} view="grid" />
      ))}

      {cars.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-600">
            No vehicles found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}
