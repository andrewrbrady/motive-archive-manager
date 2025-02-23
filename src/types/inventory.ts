import { MeasurementValue } from "./car";
import { ObjectId } from "mongodb";

export interface InventoryPageProps {
  searchParams: {
    page?: string;
    search?: string;
    make?: string;
    model?: string;
    dealer?: string;
    minPrice?: string;
    maxPrice?: string;
    minMileage?: string;
    maxMileage?: string;
    minYear?: string;
    maxYear?: string;
    transmission?: string;
    view?: string;
  };
}

export interface InventoryItemRaw {
  id: string;
  url: string;
  year: number;
  make: string;
  model: string;
  price?: number;
  mileage?: MeasurementValue;
  transmission?: string;
  dealer?: string;
  primary_image?: string;
  images?: string[];
}

interface BaseVehicle {
  year: number;
  make: string;
  model: string;
  price?: number;
  mileage?: MeasurementValue;
}

export interface InventoryItem extends BaseVehicle {
  id: string;
  url: string;
  transmission?: string;
  dealer?: string;
  primary_image?: string;
  images?: string[];
}

export function transformInventoryItem(item: InventoryItemRaw): InventoryItem {
  return {
    id: item.id,
    url: item.url,
    year: item.year,
    make: item.make,
    model: item.model,
    price: item.price,
    mileage: item.mileage,
    transmission: item.transmission,
    dealer: item.dealer,
    primary_image: item.primary_image,
    images: item.images,
  };
}

export interface RawAsset {
  _id: string;
  date: string; // YYMMDD format
  client?: string;
  description: string;
  locations: string[] | ObjectId[]; // Array of storage locations or ObjectIds
  carIds?: string[]; // Array of associated car IDs
  cars?: Car[];
  files?: {
    [location: string]: {
      path: string;
      files: string[];
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
}
