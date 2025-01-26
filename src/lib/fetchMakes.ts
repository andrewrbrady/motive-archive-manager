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
    const url = getApiUrl("makes");
    console.log("Fetching makes from:", url);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      credentials: "include", // Include credentials in the request
      next: {
        revalidate: 3600, // Cache for 1 hour
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch makes:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(
        `Failed to fetch makes: ${response.status} ${response.statusText}`
      );
    }

    const makes = await response.json();
    return makes as Make[];
  } catch (error) {
    console.error("Error fetching makes:", error);
    throw error;
  }
}
