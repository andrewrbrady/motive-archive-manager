import { ObjectId } from "mongodb";
import {
  APIResponse,
  PaginatedResponse,
  RouteHandler,
  RouteParamsWithId,
  SearchParams,
} from "../api";
import {
  Car,
  CarDocument,
  Dimensions,
  Manufacturing,
  SafetyFeatures,
} from "../car";
import { MeasurementValue } from "../measurements";
import { ImageMetadata } from "@/lib/cloudflare";

/**
 * Parameters for car search/filtering
 */
export interface CarSearchParams extends Omit<SearchParams, "sort"> {
  make?: string;
  model?: string;
  minYear?: string;
  maxYear?: string;
  minPrice?: string;
  maxPrice?: string;
  clientId?: string;
  page?: string;
  pageSize?: string;
  sort?: `${keyof typeof SortFields}_${"asc" | "desc"}`;
}

/**
 * Available sort fields for cars
 */
export const SortFields = {
  price: "price.listPrice",
  createdAt: "createdAt",
  year: "year",
  make: "make",
  model: "model",
} as const;

/**
 * Base car interfaces
 */
export interface CarPrice {
  listPrice: number | null;
  soldPrice?: number | null;
  priceHistory: Array<{
    type: "list" | "sold";
    price: number | null;
    date: string;
    notes?: string;
  }>;
}

export interface CarMileage {
  value: number;
  unit: string;
}

export interface CarClientInfo {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessType: string;
}

export interface CreateCarClientInfo extends Omit<CarClientInfo, "_id"> {}

/**
 * MongoDB car document type
 */
export interface MongoDBCar {
  _id: ObjectId;
  make: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  mileage: CarMileage;
  price: CarPrice;
  description?: string;
  specifications?: Car["specifications"];
  features?: string[];
  imageIds: ObjectId[];
  videos?: string[];
  documents: string[];
  status: string;
  client?: string;
  clientInfo?: CarClientInfo;
  dimensions?: Dimensions;
  manufacturing?: Manufacturing;
  safetyFeatures?: SafetyFeatures;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoDBImage {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  carId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

/**
 * Standardized car response format
 */
export interface StandardizedCar {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  mileage: CarMileage;
  price: CarPrice;
  description?: string;
  specifications?: Car["specifications"];
  features?: string[];
  imageIds: string[];
  images: Array<{
    _id: string;
    car_id: string;
    url: string;
    filename: string;
    metadata: ImageMetadata;
  }>;
  videos?: string[];
  documents: string[];
  status: string;
  client: string | null;
  clientInfo: (Omit<CarClientInfo, "_id"> & { _id: string }) | null;
  dimensions?: Dimensions;
  manufacturing?: Manufacturing;
  safetyFeatures?: SafetyFeatures;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body for creating a car
 */
export interface CreateCarBody {
  make: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  mileage: CarMileage;
  price: Omit<CarPrice, "priceHistory">;
  description?: string;
  specifications?: Car["specifications"];
  features?: string[];
  status: string;
  client?: string;
  clientInfo?: Omit<CarClientInfo, "_id">;
  dimensions?: Dimensions;
  manufacturing?: Manufacturing;
  safetyFeatures?: SafetyFeatures;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Request body for updating a car
 */
export interface UpdateCarBody extends Partial<CreateCarBody> {
  imageIds?: string[];
  documents?: string[];
  videos?: string[];
}

/**
 * Response types
 */
export type CarListResponse = PaginatedResponse<StandardizedCar>;
export type CarResponse = APIResponse<StandardizedCar>;

/**
 * Route handlers
 */
export type GetCarsHandler = RouteHandler<CarListResponse>;
export type CreateCarHandler = RouteHandler<CarResponse>;
export type GetCarByIdHandler = RouteHandler<CarResponse, RouteParamsWithId>;
export type UpdateCarHandler = RouteHandler<CarResponse, RouteParamsWithId>;
export type DeleteCarHandler = RouteHandler<
  APIResponse<{ success: boolean }>,
  RouteParamsWithId
>;
export type PatchCarHandler = RouteHandler<CarResponse, RouteParamsWithId>;

/**
 * Image and document types
 */
export interface CarImageData {
  imageUrl: string;
  imageId: string;
  metadata?: Record<string, unknown>;
}

export type CarImageHandler = RouteHandler<
  APIResponse<CarImageData[]>,
  RouteParamsWithId
>;

export interface CarDocumentData {
  _id: ObjectId;
  documents: ObjectId[];
}

export type CarDocumentHandler = RouteHandler<
  APIResponse<CarDocumentData[]>,
  RouteParamsWithId
>;

/**
 * MongoDB car document type for creating new cars
 */
export interface CreateMongoDBCar
  extends Omit<MongoDBCar, "_id" | "clientInfo"> {
  clientInfo?: CreateCarClientInfo;
}
