export interface Auction {
  _id: string;
  post_id?: string; // Optional since it's not always present
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
  end_date: string; // Changed from optional to required to match VehicleCard
  categories?: string[];
  comments_count?: number; // Optional since it's not always needed
  bid_count?: number;
  current_bid?: number;
  location?: string;
  platformId: string;
  platform: {
    name: string;
    shortName?: string; // Optional since it's not always needed
  };
}

export interface AuctionsResponse {
  auctions: Auction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuctionFilters {
  make?: string;
  model?: string;
  year?: number;
  platform?: string;
  platformId?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
  minYear?: number;
  maxYear?: number;
  endDate?: string;
  noReserve?: boolean;
  $or?: Array<Record<string, unknown>>;
}
