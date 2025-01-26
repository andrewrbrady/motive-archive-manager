import { cache } from "react";
import { getApiUrl } from "./utils";

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

export interface AuctionsResponse {
  auctions: Auction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const fetchAuctions = cache(async function fetchAuctions(
  page: number = 1,
  filters: Record<string, any> = {},
  pageSize: number = 24
): Promise<AuctionsResponse> {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...filters,
    });

    const response = await fetch(getApiUrl(`auctions?${queryParams}`));
    if (!response.ok) throw new Error("Failed to fetch auctions");

    const data = await response.json();
    return data as AuctionsResponse;
  } catch (error) {
    console.error("Error fetching auctions:", error);
    throw error;
  }
});
