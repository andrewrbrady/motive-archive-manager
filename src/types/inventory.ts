export interface InventoryItem {
  _id: string;
  make: string;
  model: string;
  year: number;
  price?: number;
  mileage?: number;
  vin?: string;
  description?: string;
  images?: {
    url: string;
    metadata?: {
      angle?: string;
      view?: string;
      tod?: string;
      movement?: string;
      description?: string;
    };
  }[];
  status?: "available" | "sold" | "pending";
  location?: string;
  transmission?: string;
  exteriorColor?: string;
  interiorColor?: string;
  fuelType?: string;
  bodyStyle?: string;
  createdAt?: string;
  updatedAt?: string;
}
