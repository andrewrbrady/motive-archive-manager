// components/cars/CarCard.tsx
import React from "react";
import { Car } from "@/types/car";
import { VehicleCard } from "@/components/ui/VehicleCard";

interface CarCardProps {
  car: Car;
  currentSearchParams?: string;
}

const CarCard: React.FC<CarCardProps> = ({ car, currentSearchParams }) => {
  return (
    <VehicleCard
      vehicle={car}
      variant="car"
      currentSearchParams={currentSearchParams}
    />
  );
};

export default CarCard;
