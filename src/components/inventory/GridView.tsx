import React from "react";
import { InventoryCard } from "./InventoryCard";
import { InventoryItem } from "@/types/inventory";

interface GridViewProps {
  cars: InventoryItem[];
  currentSearchParams?: URLSearchParams;
}

export const GridView: React.FC<GridViewProps> = ({ cars }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cars.map((car) => (
        <InventoryCard key={car._id} item={car} />
      ))}

      {cars.length === 0 && (
        <div className="col-span-3 text-center py-8">
          <p className="text-gray-500">No vehicles found.</p>
        </div>
      )}
    </div>
  );
};
