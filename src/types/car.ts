// types/car.ts
interface Engine {
  type: string;
  displacement: string;
  power_output: string;
  torque: string;
  features: string[];
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
  _id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color: string;
  horsepower: number;
  condition: string;
  location: string;
  description: string;
  type?: string;
  images: {
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
    };
    variants?: {
      [key: string]: string;
    };
    createdAt: string;
    updatedAt: string;
  }[];
  owner_id?: string;
  engine?: Engine;
  clientInfo?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    role?: string;
    [key: string]: string | undefined;
  } | null;
  createdAt: string;
  updatedAt: string;
  status?: "available" | "sold" | "pending";
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
