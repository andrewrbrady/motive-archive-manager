import React from "react";
import { Car } from "@/types/car";
import Link from "next/link";

interface ListViewProps {
  cars: Car[];
  currentSearchParams: string;
}

export default function ListView({ cars, currentSearchParams }: ListViewProps) {
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
            <th className="py-2 px-3 text-right font-medium border">HP</th>
            <th className="py-2 px-3 text-left font-medium border">Color</th>
            <th className="py-2 px-3 text-left font-medium border">
              Condition
            </th>
            <th className="py-2 px-3 text-left font-medium border">Location</th>
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => (
            <tr key={car._id} className="border-b hover:bg-gray-50">
              <td className="py-2 px-3 border">
                <Link
                  href={`/cars/${car._id}?${currentSearchParams}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {car.year}
                </Link>
              </td>
              <td className="py-2 px-3 border">{car.make}</td>
              <td className="py-2 px-3 border">
                {car.model}
                {car.type && (
                  <span className="text-xs uppercase text-gray-500 ml-1">
                    {car.type}
                  </span>
                )}
              </td>
              <td className="py-2 px-3 text-right border">
                {typeof car.price === "number"
                  ? `$${car.price.toLocaleString()}`
                  : car.price}
              </td>
              <td className="py-2 px-3 text-right border">
                {typeof car.mileage === "number"
                  ? `${car.mileage.toLocaleString()}`
                  : car.mileage || "-"}
              </td>
              <td className="py-2 px-3 text-right border">
                {typeof car.horsepower === "number"
                  ? car.horsepower.toLocaleString()
                  : car.horsepower || "-"}
              </td>
              <td className="py-2 px-3 border">{car.color}</td>
              <td className="py-2 px-3 border">{car.condition || "-"}</td>
              <td className="py-2 px-3 border">{car.location || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
