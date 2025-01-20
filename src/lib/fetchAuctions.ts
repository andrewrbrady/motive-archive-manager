import { cache } from "react";

export interface Auction {
  _id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  images: string[];
  link: string;
  excerpt: string;
  no_reserve?: boolean;
  date: string;
  end_date?: string;
  categories?: string[];
  comments_count: number;
  bid_count?: number;
  current_bid?: number;
  location?: string;
  platformId: string;
  platform: {
    name: string;
    shortName: string;
  };
}

export const fetchAuctions = cache(
  async (
    page: number,
    pageSize: number,
    filters: Record<string, unknown> = {}
  ) => {
    try {
      const baseUrl =
        typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.host}`
          : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      // Handle filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (key === "endDate" && typeof value === "string") {
            params.set("endDate", value);
          } else {
            params.set(key, String(value));
          }
        }
      });

      const url = `${baseUrl}/api/auctions?${params}`;
      console.log("Fetching auctions from:", url);

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch auctions");

      const data = await response.json();
      return {
        results: data.results,
        total: data.total,
      };
    } catch (error) {
      console.error("Error fetching auctions:", error);
      return {
        results: [],
        total: 0,
      };
    }
  }
);
