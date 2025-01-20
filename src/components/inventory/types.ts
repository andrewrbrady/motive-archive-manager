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
  };
}

export interface InventoryItemRaw {
  _id: { toString(): string };
  url: string;
  category: string;
  timestamp?: string | Date | { $date: string };
  color?: string;
  condition?: string;
  dealer?: string;
  fuel_type?: string;
  images?: string[];
  primary_image?: string;
  location?: string;
  make?: string;
  model?: string;
  mileage?: number;
  mileage_raw?: string;
  odometer?: number;
  price?: number;
  price_raw?: string;
  stock_number?: string;
  vehicle_type?: string;
  vin?: string;
  year?: number;
  trans?: string;
}

export interface InventoryItem {
  id: string;
  url: string;
  category: string;
  timestamp?: string;
  color?: string;
  interior_color?: string;
  condition?: string;
  dealer?: string;
  fuel_type?: string;
  images?: string[];
  primary_image?: string;
  location?: string;
  make?: string;
  model?: string;
  mileage?: number;
  mileage_raw?: string;
  odometer?: number;
  price?: number;
  price_raw?: string;
  stock_number?: string;
  vehicle_type?: string;
  type?: string;
  vin?: string;
  year?: number;
  transmission?: string;
}

export function transformInventoryItem(item: InventoryItemRaw): InventoryItem {
  return {
    id: item._id.toString(),
    url: item.url,
    category: item.category,
    timestamp:
      typeof item.timestamp === "object" && "$date" in item.timestamp
        ? item.timestamp.$date
        : item.timestamp?.toString(),
    color: item.color,
    condition: item.condition,
    dealer: item.dealer,
    fuel_type: item.fuel_type,
    images: item.images,
    primary_image: item.primary_image,
    location: item.location,
    make: item.make,
    model: item.model,
    mileage: item.mileage,
    mileage_raw: item.mileage_raw,
    odometer: item.odometer,
    price: item.price,
    price_raw: item.price_raw,
    stock_number: item.stock_number,
    vehicle_type: item.vehicle_type,
    vin: item.vin,
    year: item.year,
    transmission: item.trans,
  };
}
