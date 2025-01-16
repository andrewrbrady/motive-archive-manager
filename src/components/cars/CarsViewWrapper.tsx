// components/cars/CarsViewWrapper.tsx
"use client";

import { Button, ButtonGroup } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import CarCard from "./CarCard";
import { useRouter } from "next/navigation";

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
  currentSearchParams: string;
}

export const ListView = ({ cars }: { cars: Car[] }) => {
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
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => (
            <tr key={car._id} className="border-b hover:bg-gray-50">
              <td className="py-2 px-3 border">{car.year}</td>
              <td className="py-2 px-3 border">{car.brand}</td>
              <td className="py-2 px-3 border">
                {car.year} {car.brand} {car.model}
                {car.type && (
                  <span className="text-xs uppercase text-gray-500 ml-1">
                    {car.type}
                  </span>
                )}
              </td>
              <td className="py-2 px-3 text-right border">${car.price}</td>
              <td className="py-2 px-3 text-right border">{car.mileage}</td>
              <td className="py-2 px-3 text-right border">{car.horsepower}</td>
              <td className="py-2 px-3 border">{car.color}</td>
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
  currentSearchParams,
}: CarsViewWrapperProps) {
  const router = useRouter();

  const updateView = (view: "grid" | "list") => {
    const params = new URLSearchParams(currentSearchParams);
    params.set("view", view);
    router.push(`?${params.toString()}`);
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
