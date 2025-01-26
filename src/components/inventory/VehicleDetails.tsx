import React from "react";
import Link from "next/link";
import {
  Car,
  Calendar,
  Gauge,
  MapPin,
  Tag,
  Fuel,
  Box,
  ExternalLink,
} from "lucide-react";
import { InventoryItem } from "./types";

interface VehicleDetailsProps {
  item: InventoryItem;
  showExternalLink?: boolean;
}

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  item,
  showExternalLink = false,
}) => {
  return (
    <div className="space-y-4">
      <Link href={`/inventory/${item.id}`}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          {item.year} {item.make} {item.model}
          {item.type && (
            <span className="text-xs uppercase text-gray-500 dark:text-gray-400 ml-1">
              {item.type}
            </span>
          )}
        </h2>
      </Link>

      {/* Vehicle details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Car className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Exterior: {item.color}
          </span>
        </div>
        {item.interior_color && (
          <div className="flex items-center space-x-2">
            <Car className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Interior: {item.interior_color}
            </span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Box className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            VIN: {item.vin}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Mileage: {item.odometer}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Stock: {item.stock_number}
          </span>
        </div>
        {item.condition && (
          <div className="flex items-center space-x-2">
            <Car className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Condition: {item.condition}
            </span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Box className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Dealer: {item.dealer}
          </span>
        </div>
      </div>

      {/* External link button - only shown on detail page */}
      {showExternalLink && item.url && (
        <button
          onClick={() => window.open(item.url, "_blank")}
          className="block w-full text-center bg-blue-600 dark:bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          View on Dealer Site{" "}
          <ExternalLink className="inline-block w-4 h-4 ml-2" />
        </button>
      )}
    </div>
  );
};

export default VehicleDetails;
