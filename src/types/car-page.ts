import type { Car as BaseCar, CarImage } from "./car";
import type { MeasurementValue } from "./measurements";

export interface EngineSpecs {
  power: {
    hp: number;
    kW: number;
    ps: number;
  };
  torque: {
    "lb-ft": number;
    Nm: number;
  };
}

export interface ImageData {
  metadata: {
    angle?: string;
    description?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
    aiAnalysis?: {
      angle?: string;
      description?: string;
      movement?: string;
      tod?: string;
      view?: string;
      side?: string;
    };
  };
  variants: Record<string, string>;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface FormClientInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  role?: string;
  [key: string]: string | undefined;
}

export interface ApiClientInfo {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: Address;
  businessType: string;
}

export interface ExtendedCar
  extends Omit<
    BaseCar,
    "mileage" | "year" | "images" | "imageIds" | "clientInfo"
  > {
  mileage: MeasurementValue;
  year: number;
  images?: CarImage[];
  imageIds: string[];
  primaryImageId?: string;
  clientInfo?: ApiClientInfo;
}

export interface CarFormData extends Omit<ExtendedCar, "clientInfo"> {
  _id: string;
  images?: CarImage[];
  status: "available" | "sold" | "pending";
  clientInfo?: FormClientInfo;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
}

export interface UploadedImageData {
  id: string;
  url: string;
  filename: string;
  metadata: ImageData["metadata"];
  variants: ImageData["variants"];
  createdAt: string;
  updatedAt: string;
}

export interface BaTCarDetails {
  _id: string;
  year: number;
  make: string;
  model: string;
  color?: string;
  mileage?: {
    value: number;
    unit: string;
  };
  engine?: {
    type?: string;
    displacement?: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
    };
  };
  transmission: {
    type: string;
  };
  vin?: string;
  condition?: string;
  interior_color?: string;
  interior_features?: {
    seats: number;
    upholstery?: string;
  };
  description?: string;
}

export interface Performance {
  "0_to_60_mph"?: { value: number; unit: string };
  top_speed?: { value: number; unit: string };
}

export interface EditableSpecs {
  color?: string;
  interior_color?: string;
  mileage?: MeasurementValue;
  engine?: {
    displacement?: MeasurementValue;
    power?: EngineSpecs["power"];
    torque?: EngineSpecs["torque"];
    type?: string;
    features?: string[];
    configuration?: string;
    cylinders?: number;
    fuelType?: string;
    manufacturer?: string;
  };
  dimensions?: Record<string, MeasurementValue>;
  interior_features?: {
    seats?: number;
    upholstery?: string;
    features?: string[];
  };
  transmission?: {
    type: string;
    speeds?: number;
  };
  performance?: Performance;
}

export interface CarData
  extends Omit<
    ExtendedCar,
    | "dimensions"
    | "interior_features"
    | "transmission"
    | "mileage"
    | "year"
    | "clientInfo"
  > {
  year: number;
  mileage: MeasurementValue;
  dimensions?: Record<string, MeasurementValue>;
  interior_features?: {
    seats?: number;
    upholstery?: string;
    features?: string[];
  };
  transmission?: {
    type: string;
    speeds?: number;
  };
  performance?: Performance;
  clientInfo?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    role?: string;
    [key: string]: string | undefined;
  };
}
