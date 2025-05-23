import React from "react";
import { fetchAuctions, type AuctionFilters } from "@/lib/fetchAuctions";
import { fetchMakes } from "@/lib/fetchMakes";
import { fetchPlatforms } from "@/lib/fetchPlatforms";
import Pagination from "@/components/Pagination";
import { FiltersSection } from "@/components/auctions/FiltersSection";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";
import { AuctionsViewWrapper } from "@/components/auctions/AuctionsViewWrapper";
import { PageTitle } from "@/components/ui/PageTitle";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
    make?: string;
    model?: string;
    platformId?: string;
    minPrice?: string;
    maxPrice?: string;
    minYear?: string;
    maxYear?: string;
    endDate?: string;
    noReserve?: string;
    view?: string;
    pageSize?: string;
    tab?: string; // Add tab parameter for market page integration
  };
}

export default async function AuctionsPage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams);
  // [REMOVED] // [REMOVED] console.log("Page - Search Params:", params);

  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 24;
  const view = (params.view || "grid") as "grid" | "list";

  // Build filters object based on search params
  const filters: AuctionFilters = {};

  if (params.search) {
    filters.$or = [
      { title: { $regex: params.search, $options: "i" } },
      { make: { $regex: params.search, $options: "i" } },
      { model: { $regex: params.search, $options: "i" } },
    ];
  }

  if (params.platformId) {
    filters.platformId = params.platformId;
  }

  if (params.endDate) {
    filters.endDate = params.endDate;
  }

  // Handle noReserve filter
  if (params.noReserve === "true") {
    filters.noReserve = true;
  }

  if (params.make && params.make !== "All Makes") {
    filters.make = params.make;
  }

  if (params.model) {
    filters.model = params.model;
  }

  // Handle year range filters
  if (params.minYear) {
    filters.minYear = parseInt(params.minYear);
  }
  if (params.maxYear) {
    filters.maxYear = parseInt(params.maxYear);
  }

  // [REMOVED] // [REMOVED] console.log("Page - Filters:", filters);

  // Fetch auctions, makes, and platforms
  const [auctionsData, makes, platforms] = await Promise.all([
    fetchAuctions(page, filters, pageSize),
    fetchMakes(),
    fetchPlatforms(),
  ]);

  const { auctions, total } = auctionsData;

  // Check if we're on the market page or auctions page
  const isMarketPage = params.tab !== undefined;

  // Return the page
  return (
    <AuthGuard>
      <div className="flex flex-col space-y-6">
        {!isMarketPage && (
          <PageTitle title="Auctions" count={total}>
            <div className="flex items-center gap-4">
              <ViewModeSelector currentView={view} />
            </div>
          </PageTitle>
        )}

        <FiltersSection
          platforms={platforms}
          makes={makes}
          currentFilters={{
            platformId: params.platformId || "",
            make: params.make || "",
            minYear: params.minYear || "",
            maxYear: params.maxYear || "",
            endDate: params.endDate || "",
            noReserve: params.noReserve === "true",
          }}
        />

        <AuctionsViewWrapper auctions={auctions} view={view} />
      </div>
    </AuthGuard>
  );
}
