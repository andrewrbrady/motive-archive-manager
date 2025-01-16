export interface Platform {
  _id: string;
  name: string;
  platformId: string;
  color: string;
}

export async function fetchPlatforms() {
  try {
    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/platforms`);
    if (!response.ok) throw new Error("Failed to fetch platforms");

    const platforms = await response.json();
    return platforms as Platform[];
  } catch (error) {
    console.error("Error fetching platforms:", error);
    return [];
  }
}
