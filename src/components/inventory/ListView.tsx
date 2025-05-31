import React from "react";
import Link from "next/link";
import { VehicleInventoryItem } from "@/types/inventory";
import { ObjectId } from "mongodb";

interface ListViewProps {
  cars: VehicleInventoryItem[];
  currentSearchParams: string;
}

// Helper function to check if an ID is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export function ListView({ cars, currentSearchParams }: ListViewProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[hsl(var(--background))] border-y">
            <th className="py-2 px-3 text-left font-medium border">Year</th>
            <th className="py-2 px-3 text-left font-medium border">Make</th>
            <th className="py-2 px-3 text-left font-medium border">Model</th>
            <th className="py-2 px-3 text-right font-medium border">Price</th>
            <th className="py-2 px-3 text-right font-medium border">Mileage</th>
            <th className="py-2 px-3 text-left font-medium border">Dealer</th>
            <th className="py-2 px-3 text-left font-medium border">
              Transmission
            </th>
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => (
            <tr key={car.id} className="group hover:bg-muted/50">
              <td className="py-2 px-3 border">
                {/* Only link to car detail if the ID is a valid ObjectId */}
                {isValidObjectId(car.id) ? (
                  <Link
                    href={`/cars/${car.id}?${currentSearchParams}`}
                    className="flex items-center gap-3 text-blue-600 hover:text-blue-800"
                  >
                    {car.year}
                  </Link>
                ) : (
                  <span className="flex items-center gap-3">{car.year}</span>
                )}
              </td>
              <td className="py-2 px-3 border">{car.make}</td>
              <td className="py-2 px-3 border">{car.model}</td>
              <td className="py-2 px-3 text-right border">
                {typeof car.price === "number"
                  ? `$${car.price.toLocaleString()}`
                  : car.price}
              </td>
              <td className="py-2 px-3 text-right border">
                {car.mileage && car.mileage.value !== null
                  ? `${car.mileage.value.toLocaleString()} ${car.mileage.unit}`
                  : "-"}
              </td>
              <td className="py-2 px-3 border">{car.dealer || "-"}</td>
              <td className="py-2 px-3 border">{car.transmission || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {cars.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[hsl(var(--foreground-subtle))]">
            No vehicles found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}
