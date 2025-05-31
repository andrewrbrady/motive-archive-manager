// Simple fetcher for public endpoints (no auth required)
export const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || "An error occurred while fetching the data."
    );
  }
  return response.json();
};

// Note: The old useAPI hook and authenticated fetcher utilities have been removed.
// They have been replaced by the new global API client from @/lib/api-client.
// 
// For authenticated API calls, use:
// import { api } from "@/lib/api-client";
// 
// Example usage:
// const data = await api.get("/endpoint");
// const result = await api.post("/endpoint", { data });