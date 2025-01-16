// lib/fetchMakes.ts
import clientPromise from "@/lib/mongodb";

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
    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/makes`);
    if (!response.ok) throw new Error("Failed to fetch makes");

    const makes = await response.json();
    return makes as Make[];
  } catch (error) {
    console.error("Error fetching makes:", error);
    return [];
  }
}
