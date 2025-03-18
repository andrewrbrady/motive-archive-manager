import { ObjectId } from "mongodb";

export interface Contact {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  company?: string;
  status: "active" | "inactive";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  _id: ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  socialMedia?: {
    instagram?: string;
    website?: string;
  };
  businessType?: string;
  primaryContactId?: ObjectId | null;
  documents?: Array<{
    _id: ObjectId;
    type: string;
    title: string;
    fileName: string;
    uploadDate: Date;
  }>;
  cars?: Array<{
    _id: ObjectId;
    make: string;
    model: string;
    year: number;
    vin?: string;
    status: string;
  }>;
  status: "active" | "inactive";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
