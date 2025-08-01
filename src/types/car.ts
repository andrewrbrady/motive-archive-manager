// types/car.ts
import type { MeasurementValue } from "./measurements";
import type { Client } from "./contact";
import { ObjectId } from "mongodb";

export type { MeasurementValue };

export interface Power {
  hp: number;
  kW: number;
  ps: number;
}

export interface Torque {
  "lb-ft": number;
  Nm: number;
}

export interface Engine {
  type: string;
  displacement: MeasurementValue;
  power: Power;
  torque: Torque;
  features: string[];
  configuration?: string;
  cylinders?: number;
  fuelType?: string;
  manufacturer?: string;
}

interface SafetyFeatures {
  abs?: boolean;
  tcs?: boolean;
  esc?: boolean;
  airbags?: string[];
  tpms?: {
    type: string;
    present: boolean;
  };
  assistSystems?: string[];
}

interface Dimensions {
  wheelbase?: MeasurementValue;
  weight?: MeasurementValue;
  gvwr?: MeasurementValue;
  trackWidth?: MeasurementValue;
  length?: MeasurementValue;
  width?: MeasurementValue;
  height?: MeasurementValue;
}

interface Manufacturing {
  plant?: {
    city?: string;
    country?: string;
    company?: string;
  };
  series?: string;
  trim?: string;
  bodyClass?: string;
}

export interface AIImageAnalysis {
  angle: string;
  primaryColor: string;
  shotType: string;
  timeOfDay: string;
  description: string;
  notableFeatures: string;
}

export interface CarImage {
  _id: string;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata?: {
    category?:
      | "exterior"
      | "interior"
      | "engine"
      | "damage"
      | "documents"
      | "other";
    angle?: string;
    description?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
    isPrimary?: boolean;
    aiAnalysis?: {
      angle?: string;
      description?: string;
      movement?: string;
      tod?: string;
      view?: string;
      side?: string;
    };
  };
  carId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceHistory {
  listPrice: number | null; // Current or most recent listing price
  soldPrice?: number | null; // Final sale price if sold
  priceHistory: Array<{
    type: "list" | "sold";
    price: number | null;
    date: string;
    notes?: string;
  }>;
}

/**
 * @deprecated Use array of CarImage objects with category metadata instead
 * This interface is kept for backward compatibility and will be removed in a future version
 */
export interface CategorizedImages {
  exterior?: CarImage[];
  interior?: CarImage[];
  engine?: CarImage[];
  damage?: CarImage[];
  documents?: CarImage[];
  other?: CarImage[];
}

export interface Car {
  _id: string;
  make: string;
  model: string;
  year?: number;
  // Model reference for integration with models system
  modelId?: string; // Reference to VehicleModel
  modelInfo?: {
    // Populated model data
    _id: string;
    make: string;
    model: string;
    generation?: string;
    market_segment?: string;
    body_styles?: string[];
    // ... other model fields can be added as needed
  };
  price: PriceHistory;
  mileage?: {
    value: number;
    unit: string;
  };
  color?: string;
  interior_color?: string;
  vin?: string;
  status: "available" | "sold" | "pending";
  condition?: string;
  location?: string;
  description?: string;
  type?: string;
  engine?: {
    type?: string;
    displacement?: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
      kW: number;
      ps: number;
    };
    torque?: {
      "lb-ft": number;
      Nm: number;
    };
    features?: string[];
    configuration?: string;
    cylinders?: number;
    fuelType?: string;
    manufacturer?: string;
    fuel_capacity?: number;
  };
  client?: string;
  clientInfo?: {
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
  };
  manufacturing?: {
    plant?: {
      city?: string;
      country?: string;
      company?: string;
    };
    series?: string;
    trim?: string;
    bodyClass?: string;
    body_style?: string;
    completion_date?: string;
    delivery_date?: string;
  };
  dimensions?: {
    length?: { value: number; unit: string };
    width?: { value: number; unit: string };
    height?: { value: number; unit: string };
    wheelbase?: { value: number; unit: string };
    trackWidth?: { value: number; unit: string };
    weight?: { value: number; unit: string };
    gvwr?: { value: number; unit: string };
  };
  safety?: Record<string, any>;
  doors?: number;
  interior_features?: {
    seats?: number;
    upholstery?: string;
    features?: string[];
  };
  transmission?: {
    type: string;
    speeds?: number;
  };
  performance?: {
    "0_to_60_mph"?: { value: number; unit: string };
    top_speed?: { value: number; unit: string };
  };
  hasArticle?: boolean;
  lastArticleUpdate?: string;
  listing_page?: string;
  has_reserve?: boolean;
  documents?: string[];
  research_entries?: any[];
  // Original image array (backward compatibility)
  imageIds: string[];
  primaryImageId?: string | ObjectId;

  // New standardized image field - only array format
  images?: CarImage[];

  // @deprecated - will be removed in future version
  categorizedImages?: CategorizedImages;

  captionIds?: string[];
  eventIds?: string[];
  deliverableIds?: string[];
  documentationIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}
