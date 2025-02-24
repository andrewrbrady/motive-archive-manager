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

export interface VehicleInventoryItem extends BaseVehicle {
  id: string;
  url: string;
  transmission?: string;
  dealer?: string;
  primary_image?: string;
  images?: string[];
}

export interface StudioInventoryImage {
  id: string;
  url: string;
  filename: string;
  metadata?: {
    description?: string;
    tags?: string[];
  };
  variants?: {
    [key: string]: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StudioInventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  purchaseDate?: Date;
  lastMaintenanceDate?: Date;
  condition: "excellent" | "good" | "fair" | "poor" | "needs-repair";
  notes?: string;
  location?: string;
  isAvailable: boolean;
  currentKitId?: string; // Reference to the kit if this item is part of one
  images: StudioInventoryImage[];
  primaryImage?: string; // URL of the primary image
}

export function transformInventoryItem(
  item: InventoryItemRaw
): VehicleInventoryItem {
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

export interface Kit {
  id: string;
  name: string;
  description: string;
  items: string[]; // Array of StudioInventoryItem IDs that make up this kit
  category: KitCategory;
  isAvailable: boolean;
  notes?: string;
  location?: string;
}

export type InventoryCategory =
  | "Camera"
  | "Lens"
  | "Lighting"
  | "Audio"
  | "Grip"
  | "Power"
  | "Storage"
  | "Accessories"
  | "Other";

export type KitCategory =
  | "Camera Package"
  | "Lighting Package"
  | "Audio Package"
  | "Production Package"
  | "Custom Package";
