// types/car.ts
import { MeasurementValue } from "./measurements";

interface Power {
  hp: number;
  kW: number;
  ps: number;
}

interface Torque {
  "lb-ft": number;
  Nm: number;
}

interface Engine {
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
  id: string;
  url: string;
  filename: string;
  metadata: {
    angle?: string;
    description?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
    aiAnalysis?: AIImageAnalysis;
  };
  variants?: {
    [key: string]: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Car {
  _id?: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: MeasurementValue;
  color: string;
  interior_color: string;
  vin: string;
  status: "available" | "sold" | "pending";
  condition: string;
  location: string;
  description: string;
  type: string;
  client?: string;
  engine: Engine;
  // New fields
  safety?: SafetyFeatures;
  dimensions?: Dimensions;
  manufacturing?: Manufacturing;
  doors?: number;
  seats?: number;
  transmission?: {
    type?: string;
    speeds?: number;
  };
  driveType?: string;
  categories?: string[];
  marketingHighlights?: string[];
  aiAnalysis?: {
    [key: string]: {
      value: string;
      confidence: "confirmed" | "inferred" | "suggested";
      source: string;
    };
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  documents: string[];
  cars: string[];
}
