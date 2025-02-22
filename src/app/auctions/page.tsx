import React from "react";
import { fetchAuctions, type AuctionFilters } from "@/lib/fetchAuctions";
import { fetchMakes } from "@/lib/fetchMakes";
import { fetchPlatforms } from "@/lib/fetchPlatforms";
import Pagination from "@/components/Pagination";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { FiltersSection } from "@/components/auctions/FiltersSection";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";
import { AuctionsViewWrapper } from "@/components/auctions/AuctionsViewWrapper";
import { PageTitle } from "@/components/ui/PageTitle";

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
  };
}

export default async function AuctionsPage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams);
  console.log("Page - Search Params:", params);

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

  console.log("Page - Filters:", filters);

  const [auctionsResponse, makes, platforms] = await Promise.all([
    fetchAuctions(page, filters, pageSize),
    fetchMakes(),
    fetchPlatforms(),
  ]);

  const { auctions, total } = auctionsResponse;
  console.log("Page - Received auctions:", auctions?.length, "Total:", total);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 bg-background shadow-md">
        <Navbar />
      </nav>

      <main className="flex-1 w-full pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col space-y-6">
            <PageTitle title="Auctions" count={total}>
              <ViewModeSelector currentView={view} />
            </PageTitle>

            <FiltersSection
              currentFilters={{
                make: params.make || "",
                platformId: params.platformId || "",
                minYear: params.minYear || "",
                maxYear: params.maxYear || "",
                noReserve: params.noReserve === "true",
                endDate: params.endDate || "",
              }}
              makes={makes}
              platforms={platforms}
            />

            {total > pageSize && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
              />
            )}

            <AuctionsViewWrapper
              auctions={auctions}
              view={view as "grid" | "list"}
            />

            {total > pageSize && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
