import { ObjectId } from "mongodb";

export interface Location {
  _id?: string | ObjectId;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  description?: string;
  type: LocationType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type LocationType =
  | "Studio"
  | "Office"
  | "Warehouse"
  | "Storage"
  | "Client Site"
  | "Shooting Location"
  | "Other";

export interface LocationResponse extends Omit<Location, "_id"> {
  id: string;
}

export function formatLocation(location: Location): LocationResponse {
  return {
    id: location._id?.toString() || "",
    name: location.name,
    address: location.address,
    city: location.city,
    state: location.state,
    country: location.country,
    postalCode: location.postalCode,
    description: location.description,
    type: location.type,
    isActive: location.isActive,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  };
}
