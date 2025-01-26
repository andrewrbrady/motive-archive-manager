import React from "react";
import { fetchAuctions } from "@/lib/fetchAuctions";
import { fetchMakes } from "@/lib/fetchMakes";
import { fetchPlatforms } from "@/lib/fetchPlatforms";
import Pagination from "@/components/Pagination";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { FiltersSection } from "@/components/auctions/FiltersSection";
import { ViewModeSelector } from "@/components/ViewModeSelector";
import { AuctionsViewWrapper } from "@/components/auctions/AuctionsViewWrapper";

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
  const view = params.view || "grid";

  // Build filters object based on search params
  const filters: any = {};

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
  if (params.minYear || params.maxYear) {
    filters.minYear = params.minYear;
    filters.maxYear = params.maxYear;
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
    <div className="flex flex-col min-h-screen">
      <Navbar className="fixed top-0 w-full z-50 bg-[#1a1f3c] shadow-md" />
      <main className="flex-1 w-full pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold">
                Auctions ({total.toLocaleString()} listings)
              </h1>
              <ViewModeSelector currentView={view} />
            </div>

            <FiltersSection
              currentFilters={{
                make: params.make || "",
                model: params.model || "",
                platformId: params.platformId || "",
                minPrice: params.minPrice || "",
                maxPrice: params.maxPrice || "",
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
