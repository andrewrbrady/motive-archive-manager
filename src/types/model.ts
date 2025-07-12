import { ObjectId } from "mongodb";

// Enhanced Vehicle Model with Generation and Trim Support
export interface VehicleModel {
  _id: ObjectId;
  make: string; // Required: "BMW", "Toyota", etc.
  model: string; // Required: "3 Series", "Camry", etc.
  generation: {
    code: string; // Required: "F30", "XV70", etc.
    year_range: {
      start: number;
      end?: number; // null for current production
    };
    body_styles: string[]; // ["Sedan", "Wagon", "Coupe"]
    trims: VehicleModelTrim[];
  };
  engine_options: VehicleModelEngine[];
  market_segment?: string; // Optional: "Luxury", "Economy", "Sports", etc.
  description?: string; // Optional: General description
  tags?: string[]; // Optional: For categorization
  active: boolean; // Required: For soft delete
  created_at: Date; // Required: Timestamp
  updated_at: Date; // Required: Timestamp
}

// Trim/Variant Information
export interface VehicleModelTrim {
  name: string; // "328i", "330i", "M3", etc.
  year_range: {
    start: number;
    end?: number;
  };
  engine: string; // Engine ID reference
  transmission: string[]; // ["Manual", "Automatic", "DCT"]
  drivetrain: string[]; // ["FWD", "RWD", "AWD"]
  performance: {
    hp: number;
    torque: {
      value: number;
      unit: string; // "lb-ft", "Nm"
    };
    acceleration?: {
      "0_to_60"?: {
        value: number;
        unit: string; // "seconds"
      };
      "0_to_100"?: {
        value: number;
        unit: string; // "seconds"
      };
    };
    top_speed?: {
      value: number;
      unit: string; // "mph", "km/h"
    };
  };
  price_range?: {
    msrp: {
      min: number;
      max: number;
      currency: string; // "USD", "EUR", etc.
    };
    current_market?: {
      min: number;
      max: number;
      currency: string;
    };
  };
  fuel_economy?: {
    city_mpg?: number;
    highway_mpg?: number;
    combined_mpg?: number;
    city_l_per_100km?: number;
    highway_l_per_100km?: number;
    combined_l_per_100km?: number;
  };
  emissions_rating?: {
    standard: string; // "ULEV-II", "LEV-III", etc.
    co2_grams_per_km?: number;
  };
  standard_features: string[];
  optional_packages?: VehicleModelPackage[];
  specifications?: {
    dimensions?: {
      length?: { value: number; unit: string };
      width?: { value: number; unit: string };
      height?: { value: number; unit: string };
      wheelbase?: { value: number; unit: string };
    };
    weight?: {
      curb_weight?: { value: number; unit: string };
      gross_weight?: { value: number; unit: string };
    };
    seating_capacity?: {
      min: number;
      max: number;
    };
    cargo_capacity?: {
      value: number;
      unit: string; // "cubic feet", "liters"
    };
  };
}

// Engine Specifications
export interface VehicleModelEngine {
  id: string; // Engine code: "N20B20", "B48", "S55"
  type: string; // "I4", "I6", "V8", etc.
  displacement: {
    value: number;
    unit: string; // "L", "cc"
  };
  power: {
    hp: number;
    kW: number;
  };
  torque: {
    value: number;
    unit: string; // "lb-ft", "Nm"
  };
  fuel_type: string; // "Gasoline", "Diesel", "Electric", "Hybrid"
  aspiration: string; // "Naturally Aspirated", "Turbocharged", "Supercharged"
  configuration?: string; // "Inline", "V", "Boxer"
  valve_configuration?: string; // "DOHC", "SOHC"
  compression_ratio?: number;
  redline_rpm?: number;
}

// Optional Package Information
export interface VehicleModelPackage {
  name: string;
  features: string[];
  price?: {
    value: number;
    currency: string;
  };
}

// Frontend-safe version (ObjectId as string)
export interface VehicleModelClient
  extends Omit<VehicleModel, "_id" | "created_at" | "updated_at"> {
  _id: string;
  created_at: Date;
  updated_at: Date;
}

// For API requests
export interface CreateVehicleModelRequest
  extends Omit<VehicleModel, "_id" | "created_at" | "updated_at" | "active"> {
  // Make, model, and generation are required, everything else optional
}

export interface UpdateVehicleModelRequest
  extends Partial<Omit<VehicleModel, "_id" | "created_at" | "updated_at">> {
  _id: string;
}

// Legacy support for backward compatibility
export interface LegacyVehicleModel {
  _id: ObjectId;
  make: string;
  model: string;
  generation?: string;
  year_range?: {
    start: number;
    end?: number;
  };
  body_styles?: string[];
  engine_options?: Array<{
    type: string;
    displacement: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
      kW: number;
    };
    fuel_type?: string;
  }>;
  transmission_options?: string[];
  drivetrain_options?: string[];
  market_segment?: string;
  description?: string;
  specifications?: {
    dimensions?: {
      length?: { value: number; unit: string };
      width?: { value: number; unit: string };
      height?: { value: number; unit: string };
      wheelbase?: { value: number; unit: string };
    };
    weight_range?: {
      min: { value: number; unit: string };
      max: { value: number; unit: string };
    };
    seating_capacity?: {
      min: number;
      max: number;
    };
  };
  tags?: string[];
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Constants for form validation and UI
export const BODY_STYLES = [
  "Sedan",
  "Hatchback",
  "Wagon",
  "Coupe",
  "Convertible",
  "SUV",
  "Crossover",
  "Pickup Truck",
  "Van",
  "Minivan",
  "Roadster",
  "Targa",
] as const;

export const TRANSMISSION_OPTIONS = [
  "Manual",
  "Automatic",
  "CVT",
  "Dual-Clutch",
  "DCT",
  "Semi-Automatic",
] as const;

export const DRIVETRAIN_OPTIONS = ["FWD", "RWD", "AWD", "4WD"] as const;

export const MARKET_SEGMENTS = [
  "Economy",
  "Compact",
  "Mid-Size",
  "Full-Size",
  "Luxury",
  "Sports",
  "Performance",
  "Electric",
  "Hybrid",
  "Commercial",
] as const;

export const FUEL_TYPES = [
  "Gasoline",
  "Diesel",
  "Electric",
  "Hybrid",
  "Plug-in Hybrid",
  "Hydrogen",
  "E85",
  "CNG",
] as const;

export const ENGINE_TYPES = [
  "I3",
  "I4",
  "I5",
  "I6",
  "V6",
  "V8",
  "V10",
  "V12",
  "W12",
  "H4",
  "H6",
  "Electric",
] as const;

export const ASPIRATION_TYPES = [
  "Naturally Aspirated",
  "Turbocharged",
  "Supercharged",
  "Twin-Turbocharged",
  "Twin-Supercharged",
] as const;

export const EMISSIONS_STANDARDS = [
  "ULEV",
  "ULEV-II",
  "SULEV",
  "SULEV-II",
  "LEV-III",
  "Tier 2",
  "Tier 3",
  "Euro 6",
  "Euro 7",
] as const;
