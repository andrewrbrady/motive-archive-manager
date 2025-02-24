import { ObjectId } from "mongodb";

export interface Make {
  _id: ObjectId;
  name: string;
  country_of_origin: string;
  founded?: number;
  type?: string[];
  parent_company?: string;
  created_at: Date;
  updated_at: Date;
  active: boolean;
}
