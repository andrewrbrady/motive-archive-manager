// components/cars/CarsViewWrapper.tsx
"use client";

import { Button, ButtonGroup } from "@/components/ui/button";
import { ListView } from "./ListView";
import { LayoutGrid, List } from "lucide-react";
import CarCard from "./CarCard";

interface Car {
  _id: string;
  brand: string;
  model: string;
  year: string;
  price: string;
  mileage: string;
  color: string;
  horsepower: number;
  condition: string;
  location: string;
  description: string;
  images: string[];
  clientInfo?: {
    _id: string;
    name: string;
    [key: string]: any;
  } | null;
}

interface CarsViewWrapperProps {
  cars: Car[];
  viewMode: "grid" | "list";
  searchParams: { [key: string]: string | string[] | undefined };
}

import Link from "next/link";

export const ListView = ({ cars }) => {
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
            <tr key={car._id} className="hover:bg-gray-50">
              <td className="py-2 px-3 border">{car.year}</td>
              <td className="py-2 px-3 border">{car.brand}</td>
              <td className="py-2 px-3 border">
                <Link
                  href={`/cars/${car._id}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  {car.model}
                </Link>
              </td>
              <td className="py-2 px-3 text-right border">
                ${Number(car.price).toLocaleString()}
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

export default function CarsViewWrapper({
  cars,
  viewMode,
  searchParams,
}: CarsViewWrapperProps) {
  const updateView = (view: "grid" | "list") => {
    const params = new URLSearchParams(searchParams as Record<string, string>);
    params.set("view", view);
    window.location.href = `?${params.toString()}`;
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <ButtonGroup>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => updateView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => updateView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </ButtonGroup>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <CarCard key={car._id} car={car} />
          ))}
        </div>
      ) : (
        <ListView cars={cars} />
      )}

      {cars.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No cars found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
