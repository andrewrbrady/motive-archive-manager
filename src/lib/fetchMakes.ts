// lib/fetchMakes.ts
import { getApiUrl } from "./utils";

export interface Make {
  _id: string;
  name: string;
  country_of_origin: string;
  founded: number;
  type: string[];
  parent_company: string;
  created_at: Date;
  updated_at: Date;
  active: boolean;
}

export async function fetchMakes() {
  try {
    const response = await fetch(getApiUrl("makes"));
    if (!response.ok) throw new Error("Failed to fetch makes");

    const makes = await response.json();
    return makes as Make[];
  } catch (error) {
    console.error("Error fetching makes:", error);
    throw error;
  }
}
