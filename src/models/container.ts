import { ObjectId } from "mongodb";

export interface Container {
  _id?: string | ObjectId;
  name: string;
  type: string;
  containerNumber: number;
  locationId?: string | ObjectId;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContainerResponse
  extends Omit<Container, "_id" | "locationId"> {
  id: string;
  locationId?: string;
}

export function formatContainer(container: Container): ContainerResponse {
  return {
    id: container._id?.toString() || "",
    name: container.name,
    type: container.type,
    containerNumber: container.containerNumber,
    locationId: container.locationId?.toString(),
    description: container.description,
    isActive: container.isActive,
    createdAt: container.createdAt,
    updatedAt: container.updatedAt,
  };
}
