import { ObjectId } from "mongodb";
import { MeasurementValue } from "../measurements";
import { ImageMetadata } from "@/lib/cloudflare";

// Define missing types that were imported from "../car" and "../api"
interface Dimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: string;
}

interface Manufacturing {
  country?: string;
  factory?: string;
  date?: string;
}

interface SafetyFeatures {
  airbags?: boolean;
  abs?: boolean;
  stabilityControl?: boolean;
  blindSpotMonitoring?: boolean;
  laneDepartureWarning?: boolean;
  [key: string]: boolean | undefined;
}

interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  specifications?: {
    engine?: string;
    transmission?: string;
    drivetrain?: string;
    fuelType?: string;
    [key: string]: string | undefined;
  };
}

// API types
interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

interface RouteHandler<T, P = object> {
  GET?: (params: P) => Promise<T>;
  POST?: (params: P, body: any) => Promise<T>;
  PUT?: (params: P, body: any) => Promise<T>;
  DELETE?: (params: P) => Promise<T>;
}

interface RouteParamsWithId {
  params: {
    id: string;
  };
}

interface SearchParams {
  page?: string;
  pageSize?: string;
  sort?: string;
  [key: string]: string | undefined;
}

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

export type CreateCarClientInfo = Omit<CarClientInfo, "_id">;

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
  galleryIds?: ObjectId[];
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
  galleryIds: string[];
  galleries: Array<{
    _id: string;
    name: string;
    description?: string;
    imageIds: string[];
    thumbnailImage?: {
      _id: string;
      url: string;
    };
    createdAt: string;
    updatedAt: string;
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
