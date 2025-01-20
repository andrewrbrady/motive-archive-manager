import React from "react";
import { Car } from "@/types/car";
import CarCard from "./CarCard";

interface GridViewProps {
  cars: Car[];
  currentSearchParams: string;
}

export default function GridView({ cars, currentSearchParams }: GridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cars.map((car) => (
        <CarCard
          key={car._id}
          car={car}
          currentSearchParams={currentSearchParams}
        />
      ))}
    </div>
  );
}
