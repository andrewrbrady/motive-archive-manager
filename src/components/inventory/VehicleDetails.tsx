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
        <h2 className="text-xl font-semibold hover:text-blue-600 transition-colors">
          {item.year} {item.make} {item.model}
          {item.type && (
            <span className="text-xs uppercase text-gray-500 ml-1">
              {item.type}
            </span>
          )}
        </h2>
      </Link>

      {/* Vehicle details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Car className="w-4 h-4 text-gray-500" />
          <span className="text-sm">Exterior: {item.color}</span>
        </div>
        {item.interior_color && (
          <div className="flex items-center space-x-2">
            <Car className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Interior: {item.interior_color}</span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Box className="w-4 h-4 text-gray-500" />
          <span className="text-sm">VIN: {item.vin}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-gray-500" />
          <span className="text-sm">Mileage: {item.odometer}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Tag className="w-4 h-4 text-gray-500" />
          <span className="text-sm">Stock: {item.stock_number}</span>
        </div>
        {item.condition && (
          <div className="flex items-center space-x-2">
            <Car className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Condition: {item.condition}</span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Box className="w-4 h-4 text-gray-500" />
          <span className="text-sm">Dealer: {item.dealer}</span>
        </div>
      </div>

      {/* External link button - only shown on detail page */}
      {showExternalLink && item.url && (
        <button
          onClick={() => window.open(item.url, "_blank")}
          className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          View on Dealer Site{" "}
          <ExternalLink className="inline-block w-4 h-4 ml-2" />
        </button>
      )}
    </div>
  );
};

export default VehicleDetails;
