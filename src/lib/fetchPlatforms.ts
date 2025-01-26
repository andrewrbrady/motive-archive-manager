import { getApiUrl } from "./utils";

export interface Platform {
  _id: string;
  name: string;
  platformId: string;
  color: string;
}

export async function fetchPlatforms() {
  try {
    const response = await fetch(getApiUrl("platforms"));
    if (!response.ok) throw new Error("Failed to fetch platforms");

    const platforms = await response.json();
    return platforms as Platform[];
  } catch (error) {
    console.error("Error fetching platforms:", error);
    throw error;
  }
}
