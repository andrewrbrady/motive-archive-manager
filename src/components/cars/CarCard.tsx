// components/cars/CarCard.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Car } from "@/types/car";

interface CarCardProps {
  car: Car;
  currentSearchParams?: string;
}

const CarCard: React.FC<CarCardProps> = ({ car, currentSearchParams }) => {
  const thumbnail =
    car.images && car.images.length > 0 ? `${car.images[0].url}/public` : null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <Link
        href={`/cars/${car._id}${
          currentSearchParams ? `?${currentSearchParams}` : ""
        }`}
      >
        <div className="relative aspect-[16/10] w-full mb-6">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={`${car.make} ${car.model}`}
              fill
              className="object-cover rounded-lg"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center rounded-lg">
              <span className="text-gray-500 dark:text-gray-400">
                No image available
              </span>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {car.year} {car.make} {car.model}
            {car.type && (
              <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-2 font-medium">
                {car.type}
              </span>
            )}
          </h3>
          <div className="space-y-1.5">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {typeof car.price === "number"
                ? `$${car.price.toLocaleString()}`
                : car.price}
            </p>
            {typeof car.mileage === "number" && !isNaN(car.mileage) && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {car.mileage.toLocaleString()} miles
              </p>
            )}
            {car.color && car.color !== "NaN" && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Color: {car.color}
              </p>
            )}
            {car.clientInfo?.name && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Dealer: {car.clientInfo.name}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default CarCard;
