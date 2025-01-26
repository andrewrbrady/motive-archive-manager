import React from "react";
import Link from "next/link";
import { InventoryItem } from "@/types/inventory";

interface ListViewProps {
  cars: InventoryItem[];
  currentSearchParams: string;
}

export function ListView({ cars, currentSearchParams }: ListViewProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-y">
            <th className="py-2 px-3 text-left font-medium border">Year</th>
            <th className="py-2 px-3 text-left font-medium border">Make</th>
            <th className="py-2 px-3 text-left font-medium border">Model</th>
            <th className="py-2 px-3 text-right font-medium border">Price</th>
            <th className="py-2 px-3 text-right font-medium border">Mileage</th>
            <th className="py-2 px-3 text-left font-medium border">Location</th>
            <th className="py-2 px-3 text-left font-medium border">Dealer</th>
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => (
            <tr key={car.id} className="border-b hover:bg-gray-50">
              <td className="py-2 px-3 border">
                <Link
                  href={`/cars/${car.id}?${currentSearchParams}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {car.year}
                </Link>
              </td>
              <td className="py-2 px-3 border">{car.make}</td>
              <td className="py-2 px-3 border">{car.model}</td>
              <td className="py-2 px-3 text-right border">
                {typeof car.price === "number"
                  ? `$${car.price.toLocaleString()}`
                  : car.price}
              </td>
              <td className="py-2 px-3 text-right border">
                {typeof car.mileage === "number"
                  ? car.mileage.toLocaleString()
                  : car.mileage || "-"}
              </td>
              <td className="py-2 px-3 border">{car.location || "-"}</td>
              <td className="py-2 px-3 border">{car.dealer || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {cars.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No vehicles found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}
