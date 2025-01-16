// components/cars/CarCard.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";

interface Car {
  _id: string;
  brand: string;
  model: string;
  year: string;
  price: string;
  mileage: string | number;
  color: string | number;
  images?: string[];
  clientInfo?: {
    name: string;
  };
}

interface CarCardProps {
  car: Car;
}

const CarCard: React.FC<CarCardProps> = ({ car }) => {
  const thumbnail =
    car.images && car.images.length > 0 ? `${car.images[0]}/public` : null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/cars/${car._id}`}>
        <div className="relative w-full h-48">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={`${car.brand} ${car.model}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">
            {car.brand} {car.model} ({car.year})
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">{car.price}</p>
            {typeof car.mileage === "number" && !isNaN(car.mileage) && (
              <p className="text-sm text-gray-600">
                {car.mileage.toLocaleString()} miles
              </p>
            )}
            {car.color && car.color !== "NaN" && (
              <p className="text-sm text-gray-600">Color: {car.color}</p>
            )}
            {car.clientInfo?.name && (
              <p className="text-sm text-gray-600">
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
