// types/car.ts
interface Engine {
  type: string;
  displacement: string;
  power_output: string;
  torque: string;
  features: string[];
}

interface CarImage {
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
}

export interface Car {
  _id: string;
  brand: string;
  model: string;
  year: string | number;
  price: string;
  mileage: string | number;
  color: string | number;
  engine: Engine;
  horsepower: number | null;
  condition: "New" | "Used" | "";
  location: string;
  description: string;
  images: CarImage[];
  history_report: string;
  owner_id: string;
  documents: string[];
  client: string;
  type?: string;
  clientInfo?: {
    _id: string;
    name: string;
    [key: string]: string | undefined;
  };
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
