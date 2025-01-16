import React from "react";
import Link from "next/link";
import { Car } from "@/types/car";

interface ListViewProps {
  cars: Car[];
}

const ListView: React.FC<ListViewProps> = ({ cars }) => {
  // Helper function to safely get the ID
  const getCarId = (car: Car) => {
    if (typeof car._id === "string") return car._id;
    return car._id?.$oid || car._id?.toString();
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-y">
            <th className="py-2 px-3 text-left font-medium border">Year</th>
            <th className="py-2 px-3 text-left font-medium border">Brand</th>
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
            <tr key={getCarId(car)} className="hover:bg-gray-50">
              <td className="py-2 px-3 border">{car.year}</td>
              <td className="py-2 px-3 border">{car.brand}</td>
              <td className="py-2 px-3 border">
                <Link
                  href={`/cars/${getCarId(car)}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate">
                      {car.year} {car.brand} {car.model}
                      {car.type && (
                        <span className="text-sm uppercase tracking-wider text-gray-500 ml-2 font-medium">
                          {car.type}
                        </span>
                      )}
                    </h3>
                    <div className="mt-2 space-y-1.5">
                  </div>
                </Link>
              </td>
              <td className="py-2 px-3 text-right border">
                {car.price === "P.O.A."
                  ? "P.O.A."
                  : `$${Number(car.price).toLocaleString()}`}
              </td>
              <td className="py-2 px-3 text-right border">
                {Number(car.mileage).toLocaleString()}
              </td>
              <td className="py-2 px-3 text-right border">
                {car.horsepower || "-"}
              </td>
              <td className="py-2 px-3 border">{car.color || "-"}</td>
              <td className="py-2 px-3 border">{car.condition || "-"}</td>
              <td className="py-2 px-3 border">{car.location || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ListView;
